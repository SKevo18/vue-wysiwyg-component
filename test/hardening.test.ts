import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, effectScope, h, nextTick, ref } from "vue";
import { createDocument, Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { createMarkdown, defineFenceBlock, escapeHtml, markdownToHtml, normalizeHref, takeFresh, insertFresh, useDraft, useFenceSync, type DraftAdapter, type UploadOptions } from "../src/index";
import { resolveConfig, schemaFor } from "../src/schema";
import { createFileController } from "../src/editor/files";
import { EDITOR_CONTEXT, type EditorContext } from "../src/editor/context";
import Dropdown from "../src/components/Dropdown.vue";
import LinkDialog from "../src/components/LinkDialog.vue";
import Modal from "../src/components/Modal.vue";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("fence attributes from html", () => {
  const census = defineFenceBlock({ kind: "census" });
  const md = createMarkdown([census]);

  it("drops non-string and malformed attribute values so serialising cannot throw", () => {
    const attrs = JSON.stringify({ id: { "a b": 1 }, list: [1], ok: "y", "bad key": "z", multi: "a\nb", n: 3 });
    const doc = createDocument(`<div data-fence="census" data-attrs='${attrs}' data-body="badger: 2">census</div>`, md.schema);
    expect(doc.child(0).attrs.attrs).toEqual({ ok: "y" });
    expect(md.serialize(doc)).toBe("```census ok=y\nbadger: 2\n```\n");
    const array = createDocument(`<div data-fence="census" data-attrs="[1,2]">census</div>`, md.schema);
    expect(array.child(0).attrs.attrs).toEqual({});
  });
});

describe("links and rendering of untrusted markdown", () => {
  it("drops script and data schemes, also with control characters inside", () => {
    for (const href of ["javascript:alert(1)", " JaVa\tScRiPt:alert(1)", "java\nscript:x", "vbscript:x", "data:text/html,<b>x</b>"]) expect(normalizeHref(href), href).toBe("");
    expect(normalizeHref("example.com/a")).toBe("https://example.com/a");
    expect(normalizeHref("a@b.cz")).toBe("mailto:a@b.cz");
  });

  it("keeps script links, data images and raw html inert in toHtml", () => {
    const html = markdownToHtml('[a](javascript:alert(1)) ![x](data:text/html,<b>) <script>alert(1)</script> <img src=x onerror="alert(1)">\n');
    const div = document.createElement("div");
    div.innerHTML = html;
    expect(div.querySelectorAll("a, img, script")).toHaveLength(0);
    expect(html).not.toContain("<script");
  });

  it("escapes quotes and apostrophes", () => {
    expect(escapeHtml(`<a href="x" title='y'>&`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;");
  });

  it("reuses one converter without extensions", () => {
    expect(createMarkdown()).toBe(createMarkdown());
  });
});

describe("useFenceSync", () => {
  it("follows a getter source and skips publishing what it received", async () => {
    const scope = effectScope();
    const node = ref({ attrs: { a: "1" }, body: "x" });
    const emit = vi.fn();
    const reload = vi.fn();
    const publish = scope.run(() => useFenceSync(() => node.value, emit, reload))!;
    node.value = { attrs: { a: "2" }, body: "y" };
    await nextTick();
    expect(reload).toHaveBeenCalledWith({ a: "2" }, "y");
    publish({ a: "2" }, "y");
    expect(emit).not.toHaveBeenCalled();
    publish({ a: "3" }, "y");
    expect(emit).toHaveBeenCalledWith({ a: "3" }, "y");
    scope.stop();
  });
});

describe("useDraft outside components", () => {
  it("removes its window listeners when the owning scope stops", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const adapter: DraftAdapter = { load: async () => null, save: async () => undefined, remove: async () => undefined };
    const scope = effectScope();
    scope.run(() => useDraft(adapter, { scope: "note:1", content: ref("x") }));
    scope.stop();
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["online", "offline"]));
  });
});

describe("insertFresh", () => {
  it("clears the open-for-editing flag when the insert fails", () => {
    const editor = new Editor({ extensions: [Document, Paragraph, Text], content: "<p>x</p>" });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      insertFresh(editor, "missingBlock");
    } catch {
    }
    expect(takeFresh("missingBlock")).toBe(false);
    editor.destroy();
  });
});

describe("uploads", () => {
  it("passes progress and an abort signal to services.upload", async () => {
    let options!: UploadOptions;
    const upload = vi.fn(async (_file: File, o: UploadOptions) => {
      options = o;
      o.onProgress?.(0.5);
      return { url: "/files/a.txt", name: "a.txt", type: "text/plain" };
    });
    const progress = vi.fn();
    const config = resolveConfig("markdown", { downscale: false });
    const files = createFileController({ editor: () => null, config, services: { upload }, t: (k) => k, locale: "en", progress });
    await files.upload(new File(["a"], "a.txt", { type: "text/plain" }));
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(progress.mock.calls).toEqual([[1, null], [1, 0.5], [0, null]]);
    files.dispose();
    expect(options.signal!.aborted).toBe(true);
  });
});

function context(over: Partial<EditorContext> = {}): EditorContext {
  return { t: (k: string) => k, services: {}, ...over } as EditorContext;
}

describe("menus and dialogs", () => {
  it("moves keyboard focus into an opened dropdown and back to the trigger on Esc", async () => {
    const w = mount(Dropdown, {
      attachTo: document.body,
      slots: {
        trigger: ({ toggle }: { toggle: () => void }) => h("button", { class: "trigger", onClick: toggle }, "Open"),
        default: () => [h("button", { class: "a" }, "A"), h("button", { class: "b" }, "B")],
      },
    });
    const trigger = w.get(".trigger").element as HTMLButtonElement;
    trigger.focus();
    await w.get(".trigger").trigger("click");
    await nextTick();
    await nextTick();
    expect((document.activeElement as HTMLElement).className).toBe("a");
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect((document.activeElement as HTMLElement).className).toBe("b");
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelector(".wy-dropdown-panel")).toBeNull();
    w.unmount();
  });

  it("keeps Tab inside an open modal", async () => {
    const w = mount(Modal, { attachTo: document.body, props: { open: false, title: "T" }, slots: { default: () => h("button", { class: "last" }, "Last") } });
    await w.setProps({ open: true });
    await nextTick();
    const close = document.querySelector<HTMLElement>(".wy-modal-head button")!;
    const last = document.querySelector<HTMLElement>(".last")!;
    last.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
    close.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    w.unmount();
  });

  it("applies the first hit when Enter is pressed while the link search is pending, never the raw query", async () => {
    vi.useFakeTimers();
    const { promise, resolve } = Promise.withResolvers<{ href: string; title: string }[]>();
    const searchLinks = vi.fn(() => promise);
    const Host = defineComponent({
      props: { open: Boolean },
      emits: ["apply"],
      setup(props, { emit }) {
        return () => h(LinkDialog, { open: props.open, href: "", text: "", hasLink: false, onApply: (href: string, text: string) => emit("apply", href, text) });
      },
    });
    const w = mount(Host, { attachTo: document.body, props: { open: false }, global: { provide: { [EDITOR_CONTEXT as symbol]: context({ services: { searchLinks } }) } } });
    await w.setProps({ open: true });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>(".wy-modal input")!;
    input.value = "about us";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(w.emitted("apply")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(300);
    resolve([{ href: "/about", title: "About" }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(w.emitted("apply")).toEqual([["/about", "About"]]);
    w.unmount();
  });
});

describe("html schema", () => {
  it("keeps a valid divider look", () => {
    const schema = schemaFor(resolveConfig("html", undefined));
    const doc = createDocument('<hr data-color="#A1B2C3" data-style="dotted">', schema);
    expect(doc.child(0).attrs).toMatchObject({ color: "#a1b2c3", style: "dotted" });
  });
});
