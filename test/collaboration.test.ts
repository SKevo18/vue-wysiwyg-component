import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { Bold, MessageSquare } from "@lucide/vue";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import { WysiwygEditor, defineEditorExtension, type EditorExtension, type EditorHandle } from "../src/index";

let wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const w of wrappers) w.unmount();
  wrappers = [];
});

async function mountEditor(props: Record<string, unknown>) {
  const ready = Promise.withResolvers<EditorHandle>();
  const wrapper = mount(WysiwygEditor, { props: { modelValue: "", ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  wrappers.push(wrapper);
  return { wrapper, handle: await ready.promise };
}

const collab = (document: Y.Doc) => ({ extensions: [Collaboration.configure({ document, field: "default" })] });

function pressMod(handle: EditorHandle, key: string, shift = false) {
  const mac = /Mac|iP(hone|[oa]d)/.test(navigator.platform);
  const event = new KeyboardEvent("keydown", { key, shiftKey: shift, metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true });
  handle.editor!.view.dom.dispatchEvent(event);
}

describe("collaboration mode", () => {
  it("converges two editors on one shared document and keeps emitting v-model", async () => {
    const ydoc = new Y.Doc();
    const a = await mountEditor({ collaboration: collab(ydoc) });
    const b = await mountEditor({ collaboration: collab(ydoc) });

    a.handle.editor!.chain().setTextSelection(1).insertContent("Wombat <strong>burrow</strong>").run();
    await vi.waitFor(() => expect(b.handle.getContent()).toBe("Wombat **burrow**\n"));
    b.handle.editor!.commands.insertContentAt(b.handle.editor!.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: "Quokka trail." }] });
    await vi.waitFor(() => expect(a.handle.getContent()).toBe("Wombat **burrow**\n\nQuokka trail.\n"));

    // the local edit in b and the remote one in a both reach v-model through the debounced serialization
    await vi.waitFor(() => expect(b.wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["Wombat **burrow**\n\nQuokka trail.\n"]));
    expect(a.wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["Wombat **burrow**\n\nQuokka trail.\n"]);
    expect(b.wrapper.find(".wy-content strong").text()).toBe("burrow");
  });

  it("takes content from the shared document, never from modelValue", async () => {
    const ydoc = new Y.Doc();
    const a = await mountEditor({ collaboration: collab(ydoc) });
    a.handle.editor!.chain().setTextSelection(1).insertContent("Shared numbat.").run();

    const b = await mountEditor({ modelValue: "# Local draft\n", collaboration: collab(ydoc) });
    await vi.waitFor(() => expect(b.handle.getContent()).toBe("Shared numbat.\n"));
    await b.wrapper.setProps({ modelValue: "# Stale prop\n" });
    expect(b.handle.getContent()).toBe("Shared numbat.\n");
    expect(a.handle.getContent()).toBe("Shared numbat.\n");
  });

  it("undoes and redoes through the shared history from the shortcut, command and toolbar", async () => {
    const ydoc = new Y.Doc();
    const { wrapper, handle } = await mountEditor({ collaboration: collab(ydoc) });
    const editor = handle.editor!;
    expect(editor.extensionManager.extensions.some((e) => e.name === "undoRedo")).toBe(false);
    const undo = wrapper.get('.wy-toolbar button[aria-label="Undo"]');
    expect(undo.attributes("disabled")).toBeDefined();

    editor.chain().setTextSelection(1).insertContent("Bilby den.").run();
    await wrapper.vm.$nextTick();
    expect(handle.getContent()).toBe("Bilby den.\n");
    expect(undo.attributes("disabled")).toBeUndefined();

    pressMod(handle, "z");
    expect(handle.getContent()).toBe("");
    expect(ydoc.getXmlFragment("default").toString()).not.toContain("Bilby");
    pressMod(handle, "z", true);
    expect(handle.getContent()).toBe("Bilby den.\n");

    expect(editor.commands.historyUndo()).toBe(true);
    expect(handle.getContent()).toBe("");
    expect(editor.commands.historyRedo()).toBe(true);
    expect(handle.getContent()).toBe("Bilby den.\n");

    await undo.trigger("click");
    expect(handle.getContent()).toBe("");
  });

  it("leaves the local undo history in place without collaboration", async () => {
    const { handle } = await mountEditor({ modelValue: "Potoroo.\n" });
    expect(handle.editor!.extensionManager.extensions.some((e) => e.name === "undoRedo")).toBe(true);
    handle.editor!.chain().setTextSelection(9).insertContent(" Bandicoot.").run();
    pressMod(handle, "z");
    expect(handle.getContent()).toBe("Potoroo.\n");
  });
});

describe("readonly bubble tools", () => {
  const run = vi.fn();
  const tools: EditorExtension = defineEditorExtension({
    name: "comments",
    bubble: [
      { id: "comment", label: "Comment", icon: MessageSquare, readonly: true, run },
      { id: "shout", label: "Shout", icon: Bold, run: () => {} },
    ],
  });
  const labels = () => [...document.querySelectorAll<HTMLElement>(".wy-bubble .wy-tool")].map((el) => el.getAttribute("aria-label"));

  it("shows only readonly-marked tools on a selection in a readonly editor", async () => {
    const { handle } = await mountEditor({ modelValue: "Echidna spines.\n", readonly: true, extensions: [tools] });
    handle.editor!.commands.setTextSelection({ from: 1, to: 8 });
    await vi.waitFor(() => expect(labels()).toEqual(["Comment"]));
    document.querySelector<HTMLButtonElement>('.wy-bubble [aria-label="Comment"]')!.click();
    expect(run).toHaveBeenCalledOnce();
  });

  it("shows every tool when editable and no bubble when readonly without readonly tools", async () => {
    const editable = await mountEditor({ modelValue: "Echidna spines.\n", extensions: [tools] });
    editable.handle.editor!.commands.setTextSelection({ from: 1, to: 8 });
    await vi.waitFor(() => expect(labels()).toEqual(expect.arrayContaining(["Bold", "Comment", "Shout"])));
    const plain = await mountEditor({ modelValue: "Echidna spines.\n", readonly: true });
    expect(plain.wrapper.findComponent({ name: "BubbleMenu" }).exists()).toBe(false);
  });
});
