import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import { TextSelection } from "@tiptap/pm/state";
import { WysiwygEditor, type EditorHandle, type EditorServices } from "../src/index";
import { contextOf } from "../src/editor/context";
import { openPageSearch } from "../src/builtins/pageLink";

const BASE = { details: true, toc: true, pageLinks: true, mentions: true, breadcrumbs: true, ai: true, diagrams: true };

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

async function mountEditor(props: Record<string, unknown>) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue: "", base: BASE, ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return { wrapper, handle: await ready.promise };
}

async function settle() {
  await flushPromises();
  await nextTick();
}

/** one transaction per character, like typing */
function type(handle: EditorHandle, text: string) {
  const view = handle.editor!.view;
  for (const ch of text) view.dispatch(view.state.tr.insertText(ch));
}

function posOf(handle: EditorHandle, name: string): number {
  let at = -1;
  handle.editor!.state.doc.descendants((n, pos) => {
    if (at < 0 && n.type.name === name) at = pos;
  });
  return at;
}

const slashLabels = () => [...document.querySelectorAll(".wy-slash .wy-slash-label")].map((e) => e.textContent);

/** runs a slash item the way picking it does, over the typed "/" */
async function runSlash(handle: EditorHandle, id: string) {
  const editor = handle.editor!;
  editor.commands.focus("end");
  type(handle, "/");
  const to = editor.state.selection.from;
  contextOf(editor).slashItems.find((i) => i.id === id)!.run(editor, { from: to - 1, to });
  await settle();
}

describe("slash menu", () => {
  it("keeps the menu open over spaces while items match", async () => {
    const { handle } = await mountEditor({ modelValue: "Intro\n", services: { searchMentions: async () => [] } satisfies EditorServices });
    handle.editor!.commands.focus("end");
    type(handle, " /link to");
    await settle();
    expect(slashLabels()).toContain("Link to page");
    type(handle, " p");
    await settle();
    expect(slashLabels()).toEqual(["Link to page"]);
  });

  it("closes once nothing matches or on a second space", async () => {
    const { handle } = await mountEditor({ modelValue: "Intro\n" });
    handle.editor!.commands.focus("end");
    type(handle, " /toggle l");
    await settle();
    expect(slashLabels()).toContain("Toggle list");
    type(handle, "zz");
    await settle();
    expect(document.querySelector(".wy-slash")).toBeNull();

    type(handle, " /toggle ");
    await settle();
    expect(document.querySelector(".wy-slash")).not.toBeNull();
    type(handle, " ");
    await settle();
    expect(document.querySelector(".wy-slash")).toBeNull();
  });
});

describe("inserting blocks", () => {
  it.each([
    ["tableOfContents", "```toc\n```"],
    ["breadcrumbs", "```breadcrumbs\n```"],
  ])("types after a new %s instead of replacing it", async (id, fence) => {
    const { handle } = await mountEditor({ modelValue: "" });
    await runSlash(handle, id);
    type(handle, "x");
    expect(handle.getContent()).toBe(`${fence}\n\nx\n`);
  });

  it("puts the caret in a new toggle's title and Enter there opens it and moves into its body", async () => {
    const { handle } = await mountEditor({ modelValue: "Intro\n" });
    handle.editor!.commands.focus("end");
    handle.editor!.commands.enter();
    await runSlash(handle, "details");
    await new Promise(requestAnimationFrame);
    const title = document.querySelector<HTMLInputElement>(".wy-details-title")!;
    expect(document.activeElement).toBe(title);
    title.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await settle();
    const at = posOf(handle, "details");
    const details = handle.editor!.state.doc.nodeAt(at)!;
    expect(details.attrs.open).toBe(true);
    const { from } = handle.editor!.state.selection;
    expect(from > at && from < at + details.nodeSize).toBe(true);
    type(handle, "x");
    expect(details.textContent).toBe("");
    expect(handle.editor!.state.doc.nodeAt(at)!.textContent).toBe("x");
  });
});

describe("diagram tools while the source is open", () => {
  it("keeps the source and the tools when the width field takes focus, and the buttons keep the editor focus", async () => {
    const { handle } = await mountEditor({ modelValue: "```mermaid\ngraph TD; A-->B\n```\n" });
    await settle();
    const editor = handle.editor!;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 3)));
    editor.view.focus();
    await settle();
    const node = () => document.querySelector(".wy-node-code")!;
    expect(node().classList.contains("is-editing")).toBe(true);
    const align = document.querySelector<HTMLButtonElement>('.wy-media-tools button[aria-label="Right"]')!;
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    align.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);

    // a browser renders between the editor's blur and the field's focus
    const width = document.querySelector<HTMLInputElement>(".wy-media-tools input")!;
    const hasFocus = vi.spyOn(editor.view, "hasFocus").mockReturnValue(false);
    editor.view.dom.dispatchEvent(new FocusEvent("blur", { relatedTarget: width }));
    await settle();
    expect(node().classList.contains("is-source-hidden")).toBe(false);
    expect(document.querySelector(".wy-media-tools input")).toBe(width);
    width.focus();
    hasFocus.mockRestore();
    width.value = "60";
    width.dispatchEvent(new Event("change"));
    await settle();
    expect(handle.getContent()).toBe("```mermaid width=60\ngraph TD; A-->B\n```\n");
  });
});

describe("AI block", () => {
  it("starts editing when the empty instruction field takes focus, so typing keeps the field", async () => {
    const aiGenerate = async function* () {};
    const { handle } = await mountEditor({ modelValue: "```ai\nOld\n```\n", services: { aiGenerate } satisfies EditorServices });
    await settle();
    handle.editor!.commands.setTextSelection(posOf(handle, "aiBlock") + 3);
    const area = document.querySelector<HTMLTextAreaElement>(".wy-ai-input")!;
    area.focus();
    await settle();
    area.value = "S";
    area.dispatchEvent(new Event("input"));
    await settle();
    expect(document.querySelector(".wy-ai-input")).toBe(area);
  });

  it("undoes a generation streamed with pauses in one step on a collaborative page", async () => {
    let runs = 0;
    async function* aiGenerate() {
      runs++;
      for (const piece of ["## Sum", "mary\n\n- a", "\n- b"]) {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        yield piece;
      }
    }
    const ydoc = new Y.Doc();
    const { handle } = await mountEditor({ collaboration: { extensions: [Collaboration.configure({ document: ydoc, field: "default" })] }, services: { aiGenerate } satisfies EditorServices });
    const editor = handle.editor!;
    editor.commands.setContent(contextOf(editor).markdown.parse('```ai prompt="Summarize"\nOld\n```\n', editor.schema).toJSON());
    // a capture timeout of 0 makes every pause between pieces longer than Yjs merges
    const undoPlugin = editor.state.plugins.find((p) => "key" in p && typeof p.key === "string" && p.key.startsWith("y-undo$"))!;
    const manager: Y.UndoManager = undoPlugin.getState(editor.state).undoManager;
    manager.captureTimeout = 0;
    manager.stopCapturing();
    await settle();
    (document.querySelector(".wy-node-ai .wy-block-tools button") as HTMLElement).click();
    await settle();
    const generate = [...document.querySelectorAll<HTMLButtonElement>(".wy-ai-panel button")].find((b) => b.textContent === "Generate")!;
    generate.click();
    await vi.waitFor(() => expect(handle.getContent()).toMatch(/^```ai prompt=Summarize updated=\S+\n## Summary\n\n- a\n- b\n```\n$/), { timeout: 4000 });
    // Regenerate writes the same again as a second step
    (document.querySelector(".wy-node-ai .wy-block-tools button") as HTMLElement).click();
    await settle();
    const regenerate = [...document.querySelectorAll<HTMLButtonElement>(".wy-ai-panel button")].find((b) => b.textContent === "Regenerate")!;
    const first = handle.getContent();
    regenerate.click();
    await vi.waitFor(() => expect(handle.getContent()).not.toBe(first), { timeout: 4000 });
    expect(runs).toBe(2);
    await settle();
    editor.commands.undo();
    expect(handle.getContent()).toMatch(/^```ai prompt=Summarize updated=\S+\n## Summary\n\n- a\n- b\n```\n$/);
    editor.commands.undo();
    expect(handle.getContent()).toBe("```ai prompt=Summarize\nOld\n```\n");
  });
});

describe("page links", () => {
  const searchMentions = vi.fn(async () => [{ kind: "page" as const, id: "1", label: "Doc", href: "/p/1" }]);

  async function pick() {
    await vi.waitFor(() => expect(document.querySelector(".wy-suggest-item")).not.toBeNull(), { timeout: 2000 });
    (document.querySelector(".wy-suggest-item") as HTMLElement).click();
    await settle();
  }

  it("leaves the caret after one space from the @ menu", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi\n", services: { searchMentions } satisfies EditorServices });
    handle.editor!.commands.focus("end");
    type(handle, " @do");
    await pick();
    type(handle, "x");
    expect(handle.getContent()).toBe("Hi @[Doc](/p/1) x\n");
  });

  it("leaves the caret after one space from Link to page", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi there\n", services: { searchMentions } satisfies EditorServices });
    const editor = handle.editor!;
    openPageSearch(editor, 4);
    const input = document.querySelector<HTMLInputElement>(".wy-page-search input")!;
    input.value = "do";
    input.dispatchEvent(new Event("input"));
    await pick();
    type(handle, "x");
    expect(handle.getContent()).toBe("Hi @[Doc](/p/1) xthere\n");
  });

  it("does not double a space that already follows", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi  there\n", services: { searchMentions } satisfies EditorServices });
    const editor = handle.editor!;
    openPageSearch(editor, 4);
    const input = document.querySelector<HTMLInputElement>(".wy-page-search input")!;
    input.value = "do";
    input.dispatchEvent(new Event("input"));
    await pick();
    type(handle, "x");
    expect(handle.getContent()).toBe("Hi @[Doc](/p/1) xthere\n");
  });
});
