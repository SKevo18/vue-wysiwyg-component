import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { WysiwygEditor, defineFenceBlock, type EditorHandle } from "../src/index";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const census = defineFenceBlock({ kind: "census", formats: ["markdown"], slash: { group: "blocks", label: "Badger census", description: "Count animals per sett", attrs: { sett: "north" } } });

async function mountEditor(modelValue: string) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue, extensions: [census], onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return ready.promise;
}

async function openTurnInto(handle: EditorHandle, block: number) {
  const view = handle.editor!.view;
  view.dom.children[block]!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
  document.querySelector<HTMLElement>('.wy-gutter .wy-grip[role="button"]')!.click();
  await vi.waitFor(() => expect(document.querySelector(".wy-block-actions [data-convert-menu]")).not.toBeNull());
  document.querySelector<HTMLElement>(".wy-block-actions [data-convert-menu]")!.click();
  await vi.waitFor(() => expect(document.activeElement?.classList.contains("wy-convert-search")).toBe(true));
  return document.activeElement as HTMLInputElement;
}

function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input"));
}

function key(input: HTMLInputElement, k: string) {
  input.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

const listed = () => [...document.querySelectorAll<HTMLElement>(".wy-block-actions [data-convert]")].map((el) => el.textContent!.trim());

describe("turn into search", () => {
  it("filters the targets while typing and converts with the arrows and Enter", async () => {
    const handle = await mountEditor("Badger sett.\n\nOtter holt.\n");
    const search = await openTurnInto(handle, 0);
    expect(listed()).toContain("Bulleted list");
    type(search, "head");
    await vi.waitFor(() => expect(listed().every((l) => l.startsWith("Heading"))).toBe(true));
    expect(listed().slice(0, 2)).toEqual(["Heading 1", "Heading 2"]);
    key(search, "ArrowDown");
    key(search, "Enter");
    expect(handle.getContent()).toBe("## Badger sett.\n\nOtter holt.\n");
    type(search, "");
  });

  it("says when nothing matches", async () => {
    const handle = await mountEditor("Badger sett.\n");
    const search = await openTurnInto(handle, 0);
    type(search, "zebra crossing");
    await vi.waitFor(() => expect(document.querySelector(".wy-block-actions .wy-menu-empty")?.textContent).toBe("No matches"));
  });

  it("offers every slash block on an empty paragraph, host blocks too, and replaces the paragraph with it", async () => {
    const handle = await mountEditor("Intro.\n");
    const e = handle.editor!;
    e.chain().setTextSelection(e.state.doc.content.size).insertContent({ type: "paragraph" }).run();
    expect(e.state.doc.childCount).toBe(2);
    const search = await openTurnInto(handle, 1);
    expect(listed()).toEqual(expect.arrayContaining(["Table", "Divider", "Badger census"]));
    type(search, "census");
    await vi.waitFor(() => expect(listed()).toEqual(["Badger census"]));
    key(search, "Enter");
    // the paragraph itself became the block (the editor keeps its own empty line after a last atom)
    expect(e.state.doc.child(1).type.name).toBe("censusBlock");
    expect(handle.getContent()).toBe("Intro.\n\n```census sett=north\n```\n");
  });
});
