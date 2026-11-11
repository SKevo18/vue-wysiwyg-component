// Links to a heading of the same document (the table of contents, a "#Heading" link in the text) scroll to it in
// place, and a link a block already followed (a bookmark card) is not opened a second time by the editor.
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { WysiwygEditor, type EditorHandle, type EditorServices } from "../src/index";

const BASE = { toc: true, bookmarks: true };

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function mountEditor(props: Record<string, unknown>) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue: "", base: BASE, ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  const handle = await ready.promise;
  await flushPromises();
  await nextTick();
  return handle;
}

/** a full mouse click, as the browser sends it */
function click(el: Element) {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 }));
}

function spyNavigation() {
  const opened = vi.spyOn(window, "open").mockReturnValue(null);
  const scrolled: string[] = [];
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) {
    scrolled.push(this.textContent ?? "");
  });
  return { opened, scrolled };
}

describe("links to headings of the same document", () => {
  it("scroll to the heading from the table of contents without opening a tab", async () => {
    const openLink = vi.fn(() => false);
    await mountEditor({ modelValue: "```toc\n```\n\n# Intro\n\nText\n\n## Setts\n\nMore\n", services: { openLink } satisfies EditorServices });
    const { opened, scrolled } = spyNavigation();
    const entry = [...document.querySelectorAll(".wy-toc-item")].find((a) => a.textContent === "Setts")!;
    click(entry);
    await nextTick();
    expect(opened).not.toHaveBeenCalled();
    expect(openLink).not.toHaveBeenCalled();
    expect(scrolled).toEqual(["Setts"]);
  });

  it("scroll to the heading from a link in the text, matching its text or its slug", async () => {
    const openLink = vi.fn(() => false);
    await mountEditor({ modelValue: "See [the setts](#setts-and-dens) and [intro](#Intro).\n\n# Intro\n\n## Setts and dens\n\nMore\n", services: { openLink } satisfies EditorServices });
    const { opened, scrolled } = spyNavigation();
    const links = [...document.querySelectorAll(".ProseMirror a[href^='#']")];
    click(links[0]!);
    click(links[1]!);
    await nextTick();
    expect(opened).not.toHaveBeenCalled();
    expect(scrolled).toEqual(["Setts and dens", "Intro"]);
  });
});

describe("links a block follows itself", () => {
  it("open once from a bookmark card", async () => {
    await mountEditor({ modelValue: '```bookmark url=https://setts.example/north title="Badger setts" site=setts.example\n```\n', readonly: true });
    const { opened } = spyNavigation();
    click(document.querySelector(".wy-bookmark-card")!);
    await nextTick();
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
