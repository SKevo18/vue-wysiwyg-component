import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import type { NodeViewProps } from "@tiptap/vue-3";
import { useBlockNode, type BlockNode } from "../src/blocks/useBlockNode";

let wrapper: VueWrapper | null = null;
let outside: HTMLElement | null = null;
afterEach(() => {
  wrapper?.unmount();
  outside?.remove();
  content?.remove();
  wrapper = null;
  outside = null;
});

// the editor content the block lives in; another block's own controls sit in it
let content: HTMLElement | null = null;

async function editingBlock() {
  let block!: BlockNode;
  let root: HTMLElement | null = null;
  content = document.createElement("div");
  document.body.append(content);
  const props = {
    selected: false,
    getPos: () => 0,
    editor: { isEditable: true, on: vi.fn(), off: vi.fn(), view: { nodeDOM: () => root, dom: content }, commands: { setNodeSelection: vi.fn() } },
  } as unknown as NodeViewProps;
  wrapper = mount(defineComponent({
    setup() {
      block = useBlockNode(props);
      return () => h("div", { ref: (el) => (root = el as HTMLElement), "data-editing": block.editing.value }, block.editing.value ? "Tall editor" : "Preview");
    },
  }), { attachTo: document.body });
  block.startEdit();
  await nextTick();
  return block;
}

describe("block read-only state", () => {
  it("follows the editor turning read-only and editable again", async () => {
    const listeners = new Set<() => void>();
    const editor = {
      isEditable: true,
      on: (_: string, fn: () => void) => listeners.add(fn),
      off: (_: string, fn: () => void) => listeners.delete(fn),
      view: { nodeDOM: () => null, dom: document.body },
      commands: { setNodeSelection: vi.fn() },
    };
    const setEditable = (value: boolean) => {
      editor.isEditable = value;
      for (const fn of listeners) fn();
    };
    let block!: BlockNode;
    wrapper = mount(defineComponent({
      setup() {
        block = useBlockNode({ selected: false, getPos: () => 0, editor } as unknown as NodeViewProps);
        return () => h("div");
      },
    }));
    expect(block.readonly.value).toBe(false);
    setEditable(false);
    expect(block.readonly.value).toBe(true);
    setEditable(true);
    expect(block.readonly.value).toBe(false);
    wrapper.unmount();
    wrapper = null;
    expect(listeners.size).toBe(0);
  });
});

describe("block editing outside interactions", () => {
  it("keeps the layout stable through an outside button's press and closes on its completed click", async () => {
    const block = await editingBlock();
    outside = document.createElement("button");
    document.body.append(outside);
    const save = vi.fn();
    outside.addEventListener("click", save);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await nextTick();
    expect(block.editing.value).toBe(true);
    outside.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    expect(block.editing.value).toBe(true);
    outside.click();
    expect(save).toHaveBeenCalledOnce();
    expect(block.editing.value).toBe(false);
  });

  it("keeps editing while a teleported dialog is used", async () => {
    const block = await editingBlock();
    outside = document.createElement("div");
    outside.setAttribute("role", "dialog");
    outside.innerHTML = "<button>Export diagram</button>";
    document.body.append(outside);
    outside.querySelector("button")!.click();
    expect(block.editing.value).toBe(true);
  });
});

describe("block editing next to other blocks", () => {
  it("ends when another block's own form field in the editor is clicked", async () => {
    const block = await editingBlock();
    content!.innerHTML = '<div class="wy-node"><div data-block-portal contenteditable="false"><input placeholder="Filter rows"></div></div>';
    content!.querySelector("input")!.click();
    expect(block.editing.value).toBe(false);
  });
});
