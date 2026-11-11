import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { WysiwygEditor, collaborationCaret, type EditorHandle, type EditorServices } from "../src/index";
import { setBlockColor } from "../src/editor/blockColor";
import { nodeRun } from "../src/editor/convert";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
});

async function mountEditor(props: Record<string, unknown>) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue: "", ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return { wrapper, handle: await ready.promise };
}

const bubbleLabels = () => [...document.querySelectorAll<HTMLElement>(".wy-bubble button")].map((el) => el.getAttribute("aria-label") ?? "");

function click(el: Element, x = 10, extra: MouseEventInit = {}) {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: x, clientY: 10, button: 0 }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: 10, button: 0, detail: 1, ...extra }));
}

describe("toolbar modes", () => {
  it("shows the fixed toolbar with a compact selection toolbar by default", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Wombat burrow.\n" });
    expect(w.find(".wy-toolbar").exists()).toBe(true);
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    await vi.waitFor(() => expect(bubbleLabels()).toEqual(expect.arrayContaining(["Bold", "Underline", "Link", "Colour"])));
    expect(document.querySelector(".wy-bubble [data-convert-menu]")).toBeNull();
  });

  it("hides the fixed toolbar in floating mode and adds the turn-into menu named after the block", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "## Quokka trail\n", toolbar: "floating" });
    expect(w.find(".wy-toolbar").exists()).toBe(false);
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    await vi.waitFor(() => expect(document.querySelector(".wy-bubble [data-convert-menu]")?.textContent?.trim()).toBe("Heading 2"));
  });

  it("keeps both toolbars in both mode", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Numbat log.\n", toolbar: "both" });
    expect(w.find(".wy-toolbar").exists()).toBe(true);
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    await vi.waitFor(() => expect(document.querySelector(".wy-bubble [data-convert-menu]")).not.toBeNull());
  });

  it("colours the selection from the floating colour menu as palette markdown", async () => {
    const { handle } = await mountEditor({ modelValue: "Echidna spines.\n", toolbar: "floating" });
    handle.editor!.commands.setTextSelection({ from: 1, to: 8 });
    await vi.waitFor(() => expect(document.querySelector(".wy-bubble .wy-color-trigger")).not.toBeNull());
    document.querySelector<HTMLButtonElement>(".wy-bubble .wy-color-trigger")!.click();
    await vi.waitFor(() => expect(document.querySelector(".wy-colors")).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.wy-colors .is-text[aria-label="Red"]')!.click();
    handle.editor!.commands.setTextSelection({ from: 1, to: 8 });
    document.querySelector<HTMLButtonElement>(".wy-bubble .wy-color-trigger")!.click();
    await vi.waitFor(() => expect(document.querySelector(".wy-colors")).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.wy-colors .wy-swatch:not(.is-text)[aria-label="Yellow"]')!.click();
    expect(handle.getContent()).toBe("[Echidna]{color=red bg=yellow} spines.\n");
  });

  it("keeps any CSS colour from the colour menu in html", async () => {
    const { handle } = await mountEditor({ modelValue: "<p>Otter</p>", format: "html" });
    handle.editor!.commands.setTextSelection({ from: 1, to: 6 });
    await vi.waitFor(() => expect(document.querySelector(".wy-bubble .wy-color-trigger")).not.toBeNull());
    document.querySelector<HTMLButtonElement>(".wy-bubble .wy-color-trigger")!.click();
    await vi.waitFor(() => expect(document.querySelector(".wy-colors")).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.wy-colors .is-text[aria-label="Green"]')!.click();
    expect(handle.getContent()).toMatch(/<span style="color: (#16a34a|rgb\(22, 163, 74\));?">Otter<\/span>/);
  });

  it("colours from the compact field tools, which sit under the text inside the field", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "<p>Otter</p>", format: "html", size: "compact" });
    handle.editor!.commands.focus();
    handle.editor!.commands.setTextSelection({ from: 1, to: 6 });
    await vi.waitFor(() => expect(w.get(".wy-field-tools").isVisible()).toBe(true));
    const tools = w.get(".wy-field-tools").element;
    expect(w.get(".wy-field-body").element.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    tools.querySelector<HTMLButtonElement>('button[aria-label="Colour"]')!.click();
    await vi.waitFor(() => expect(document.querySelector(".wy-colors")).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.wy-colors .is-text[aria-label="Blue"]')!.click();
    expect(handle.getContent()).toMatch(/<span style="color: (#2563eb|rgb\(37, 99, 235\));?">Otter<\/span>/);
    window.getSelection()?.removeAllRanges();
  });
});

describe("link clicks", () => {
  const markdown = "See [the sett](/p/sett) and [the wiki](https://example.org/badger).\n";

  it("hands a click to services.openLink, in readonly and editable editors", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const openLink = vi.fn<NonNullable<EditorServices["openLink"]>>(() => true);
    for (const readonly of [true, false]) {
      const { wrapper: w } = await mountEditor({ modelValue: markdown, readonly, services: { openLink } });
      click(w.get('.wy-content a[href="/p/sett"]').element);
      w.unmount();
      wrapper = null;
    }
    expect(openLink).toHaveBeenCalledTimes(2);
    expect(openLink.mock.calls[0]![0]).toBe("/p/sett");
    expect(openLink.mock.calls[0]![1]).toBeInstanceOf(MouseEvent);
    expect(open).not.toHaveBeenCalled();
  });

  it("opens the link in a new tab without an opener when the host does not handle it", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { wrapper: w } = await mountEditor({ modelValue: markdown, readonly: true, services: { openLink: () => false } });
    click(w.get('.wy-content a[href="https://example.org/badger"]').element);
    expect(open).toHaveBeenCalledWith("https://example.org/badger", "_blank", "noopener,noreferrer");
  });

  it("leaves drag selections and shift clicks to text selection", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { wrapper: w } = await mountEditor({ modelValue: markdown, readonly: true });
    const link = w.get('.wy-content a[href="https://example.org/badger"]').element;
    link.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 60, clientY: 10, button: 0, detail: 1 }));
    click(link, 10, { shiftKey: true });
    expect(open).not.toHaveBeenCalled();
  });
});

describe("block colours", () => {
  it("colours each item of a list from the block menu and writes the line under each item", async () => {
    const { handle } = await mountEditor({ modelValue: "- one\n- two\n\nPlain\n" });
    const e = handle.editor!;
    setBlockColor(e, nodeRun(e.state, 0)!, "blue_bg");
    const plain = e.state.doc.child(0).nodeSize;
    setBlockColor(e, nodeRun(e.state, plain)!, "red");
    expect(handle.getContent()).toBe("- one\n  {color=blue_bg}\n- two\n  {color=blue_bg}\n\nPlain\n{color=red}\n");
    setBlockColor(e, nodeRun(e.state, plain)!, null);
    expect(handle.getContent()).toBe("- one\n  {color=blue_bg}\n- two\n  {color=blue_bg}\n\nPlain\n");
  });
});

describe("collapsible blocks", () => {
  it("hides a closed body in the editor and the chevron opens it", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "```details title=Dens\nFifty entrances.\n```\n", base: { details: true } });
    const body = () => w.get<HTMLElement>(".wy-details-body").element;
    expect(body().style.display).toBe("none");
    await w.get(".wy-details-toggle").trigger("click");
    expect(body().style.display).toBe("");
    expect(handle.getContent()).toBe("```details title=Dens open\nFifty entrances.\n```\n");
  });
});

describe("link dialog", () => {
  it("searches as you type and applies the option picked with the keyboard", async () => {
    const searchLinks = vi.fn(async (q: string) => [
      { href: "/p/1", title: `${q} setts`, detail: "Field notes" },
      { href: "/p/2", title: `${q} holts`, detail: "Survey", icon: "🦦" },
    ]);
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Otters swim.\n", services: { searchLinks } });
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    await w.get('.wy-toolbar button[aria-label="Link"]').trigger("click");
    const input = document.querySelector<HTMLInputElement>('.wy-link-form input[role="combobox"]')!;
    input.value = "otter";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(document.querySelectorAll(".wy-link-option")).toHaveLength(2));
    expect(document.querySelectorAll(".wy-link-option")[1]!.textContent).toContain("Survey");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(handle.getContent()).toBe("[Otters](/p/2) swim.\n");
  });

  it("offers a typed address as the only option", async () => {
    const { wrapper: w, handle } = await mountEditor({ modelValue: "Otters swim.\n", services: { searchLinks: vi.fn(async () => []) } });
    handle.editor!.commands.setTextSelection({ from: 1, to: 7 });
    await w.get('.wy-toolbar button[aria-label="Link"]').trigger("click");
    const input = document.querySelector<HTMLInputElement>('.wy-link-form input[role="combobox"]')!;
    input.value = "example.org/otters";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(document.querySelectorAll(".wy-link-option")).toHaveLength(1));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(handle.getContent()).toBe("[Otters](https://example.org/otters) swim.\n");
  });
});

describe("collaboration carets", () => {
  it("shows a round initials badge when the avatar does not load", () => {
    const caret = collaborationCaret({ name: "Ada Lovelace Byron", color: "#e5484d", avatar: "https://example.invalid/a.png" });
    caret.querySelector("img")!.dispatchEvent(new Event("error"));
    expect(caret.querySelector("img")).toBeNull();
    expect(caret.querySelector(".collaboration-carets__initials")!.textContent).toBe("AB");
    expect(caret.querySelector(".collaboration-carets__label")!.textContent).toContain("Ada Lovelace Byron");
  });
});
