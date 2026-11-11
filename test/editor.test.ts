import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, mount, type VueWrapper } from "@vue/test-utils";
import { h } from "vue";
import { WysiwygEditor, defineEditorExtension, defineFenceBlock, type EditorHandle } from "../src/index";
import { contextOf } from "../src/editor/context";
import { applyLink } from "../src/editor/behaviour";

const census = defineFenceBlock({ kind: "census", ensureId: true, slash: { group: "blocks", rank: 80, label: "Badger census", attrs: { sett: "north" }, body: "badger: 3" } });

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

async function mountEditor(props: Record<string, unknown>, slots: Record<string, () => unknown> = {}) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue: "", ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, slots, attachTo: document.body });
  return { wrapper, handle: await ready.promise };
}

describe("WysiwygEditor", () => {
  it("registers an extension's slash item and writes its fence through v-model", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Otters\n", extensions: [census] });
    const ctx = contextOf(handle.editor!);
    const item = ctx.slashItems.find((i) => i.id === "census")!;
    expect(item.label).toBe("Badger census");
    expect(ctx.slashItems.map((i) => i.group)).toContain("blocks");
    handle.editor!.commands.focus("end");
    item.run(handle.editor!);
    const out = handle.getContent();
    expect(out).toMatch(/^Otters\n\n```census id=[a-z0-9]{8} sett=north\nbadger: 3\n```\n$/);
    const emitted = w.emitted("update:modelValue")!;
    expect(emitted[emitted.length - 1]![0]).toBe(out);
  });

  it("renders header and footer slots and the content class in the full size", async () => {
    const { wrapper: w } = await mountEditor({ modelValue: "", contentClass: "note-layout with-margin" }, { header: () => h("input", { class: "badger-title" }), footer: () => h("p", { class: "otter-count" }, "3 words") });
    expect(w.find(".badger-title").exists()).toBe(true);
    expect(w.find(".otter-count").text()).toBe("3 words");
    expect(w.find(".wy-content").classes()).toEqual(expect.arrayContaining(["wy-prose", "note-layout", "with-margin"]));
  });

  it("converts between formats through the handle", async () => {
    const { handle } = await mountEditor({ modelValue: "<p>Dig <strong>deep</strong></p>", format: "html", size: "compact" });
    expect(handle.getContent("markdown")).toBe("Dig **deep**");
    handle.setContent("## Setts", { format: "markdown" });
    expect(handle.getContent()).toBe("<h2>Setts</h2><p></p>");
  });

  it("neutralises hostile divider attributes given through setContent", async () => {
    const { handle } = await mountEditor({ modelValue: "", format: "html" });
    handle.setContent('<hr data-color="x);background:url(https://evil.example/t.png);position:fixed;inset:0;--z:(">');
    const out = handle.getContent();
    expect(out).toContain('class="wy-divider"');
    expect(out).not.toContain("evil.example");
    expect(out).not.toContain("position");
  });

  it("does not link script urls typed into the link dialog", async () => {
    const { handle } = await mountEditor({ modelValue: "<p>otter</p>", format: "html" });
    handle.editor!.commands.setTextSelection({ from: 1, to: 6 });
    applyLink(handle.editor!, "javascript:alert(1)", "");
    expect(handle.getContent()).toBe("<p>otter</p>");
  });

  it("never indexes raw message keys in slash search", async () => {
    const raw = defineEditorExtension({ name: "raw", slash: [{ id: "otterBlock", group: "blocks", label: "", run: () => undefined }] });
    const { handle } = await mountEditor({ modelValue: "", extensions: [raw] });
    const item = contextOf(handle.editor!).slashItems.find((i) => i.id === "otterBlock")!;
    expect(item.label).toBe("otterBlock");
    expect(item.description).toBe("");
    expect(contextOf(handle.editor!).slashItems.some((i) => i.keywords.includes("slash.items"))).toBe(false);
  });

  it("puts the dragged block on the clipboard, not the editor's ui", async () => {
    const { wrapper: w } = await mountEditor({ modelValue: "> [!TIP] Dusk\n> Bring **a torch**.\n\nOtter holt.\n" });
    await vi.waitFor(() => expect(w.find(".wy-gutter").exists()).toBe(true));
    // the callout's own chrome; its paragraph has a handle of its own
    w.find(".wy-content .wy-callout-title-input").element.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    const data = new Map<string, string>();
    const event = new Event("dragstart", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { clearData: () => data.clear(), setData: (k: string, v: string) => data.set(k, v), setDragImage: () => undefined, effectAllowed: "" },
    });
    w.get('.wy-gutter .wy-grip[role="button"]').element.dispatchEvent(event);
    expect(data.get("text/html")).toContain('data-type="callout"');
    expect(data.get("text/html")).toContain("<strong>a torch</strong>");
    expect(data.get("text/html")).not.toContain("<button");
    expect(data.get("text/plain")).toBe("> [!TIP] Dusk\n> Bring **a torch**.");
  });

  it("shows a callout title only once in the editor (the static data-title rule is for readers)", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "> [!TIP] Dusk visits\n> Bring a torch.\n" });
    expect(handle.editor!.getHTML()).toContain('data-title="Dusk visits"');
    expect(w.findAll(".wy-content .wy-callout[data-title]")).toHaveLength(0);
    expect((w.find(".wy-callout-title-input").element as HTMLInputElement).value).toBe("Dusk visits");
  });

  it("converts the caret block from the toolbar without a hover gutter or keyboard", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Quokka **burrow**.\n\nWombat path.\n", gutter: false });
    handle.editor!.commands.setTextSelection(3);
    const action = w.get('.wy-toolbar button[aria-label="Block"]');
    const item = (label: string) => new DOMWrapper([...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((button) => button.textContent?.trim() === label)!);

    await action.trigger("click");
    expect(action.attributes("aria-expanded")).toBe("true");
    const convert = item("Turn into");
    await convert.trigger("pointerenter", { pointerType: "touch" });
    expect(document.querySelector('[role="menu"][aria-label="Turn into"]')).toBeNull();
    await convert.trigger("click");
    await item("Heading 2").trigger("click");
    expect(handle.getContent()).toBe("## Quokka **burrow**.\n\nWombat path.\n");
    expect(action.attributes("aria-expanded")).toBe("false");

    await action.trigger("click");
    await item("Turn into").trigger("click");
    await item("Bulleted list").trigger("click");
    expect(handle.getContent()).toBe("- Quokka **burrow**.\n\nWombat path.\n");
  });

  it("keeps desktop hover and click on the conversion submenu open", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Numbat trail.\n" });
    handle.editor!.commands.setTextSelection(2);
    await w.get('.wy-toolbar button[aria-label="Block"]').trigger("click");
    const convert = new DOMWrapper(document.querySelector<HTMLButtonElement>('.wy-block-actions [data-convert-menu]')!);
    await convert.trigger("pointerenter", { pointerType: "mouse" });
    expect(document.querySelector('[role="menu"][aria-label="Turn into"]')).not.toBeNull();
    await convert.trigger("click");
    expect(document.querySelector('[role="menu"][aria-label="Turn into"]')).not.toBeNull();
  });

  it("hides selection tools in source mode and restores visual editing with the new source", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Quokka burrow.\n", sourceMode: true, focusMode: true });
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    const source = w.get('.wy-toolbar button[aria-label="Markdown source"]');
    await source.trigger("click");
    expect(w.get(".wy-source textarea").isVisible()).toBe(true);
    expect([...document.querySelectorAll<HTMLElement>(".wy-bubble-layer")].some((el) => getComputedStyle(el).display !== "none")).toBe(false);
    await w.get(".wy-source textarea").setValue("Wombat **tunnel**.\n");
    await w.setProps({ modelValue: "Wombat **tunnel**.\n" });
    await source.trigger("click");
    expect(handle.getContent()).toBe("Wombat **tunnel**.\n");
    expect(w.get(".wy-content strong").text()).toBe("tunnel");
    await vi.waitFor(() => expect(handle.editor!.view.hasFocus()).toBe(true));
    handle.editor!.view.dom.blur();
    await w.get('.wy-toolbar button[aria-label="Focus mode"]').trigger("click");
    await vi.waitFor(() => expect(handle.editor!.view.hasFocus()).toBe(true));
    await w.get(".wy-content").trigger("keydown", { key: "Escape" });
    expect(w.classes()).not.toContain("is-fullscreen");
  });

  it("keeps the keys it handles from host shortcuts and lets the others through", async () => {
    const { handle } = await mountEditor({ modelValue: "Badger sett.\n", shortcuts: ["Mod-Shift-p"] });
    const seen: string[] = [];
    const host = (e: KeyboardEvent) => seen.push(`${e.shiftKey ? "Shift-" : ""}${e.key}`);
    window.addEventListener("keydown", host);
    try {
      const mod = /Mac|iP(hone|[oa]d)/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };
      const press = (key: string, extra: KeyboardEventInit = {}) => handle.editor!.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra }));
      handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
      press("k", mod);
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
      press("b", mod);
      press("p", { ...mod, shiftKey: true });
      expect(seen).toEqual([]);
      expect(handle.getContent()).toBe("**Badger** sett.\n");
      press("q", mod);
      press("x");
      expect(seen).toEqual(["q", "x"]);
    } finally {
      window.removeEventListener("keydown", host);
    }
  });
});
