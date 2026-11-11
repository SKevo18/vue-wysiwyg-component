import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { NodeSelection } from "@tiptap/pm/state";
import { WysiwygEditor, type EditorHandle } from "../src/index";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

async function mountEditor(modelValue: string, props: Record<string, unknown> = {}) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue, ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return ready.promise;
}

const mod = /Mac|iP(hone|[oa]d)/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };

function press(handle: EditorHandle, key: string): KeyboardEvent {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mod });
  handle.editor!.view.dom.dispatchEvent(e);
  return e;
}

function selected(handle: EditorHandle): string {
  const { from, to } = handle.editor!.state.selection;
  return handle.editor!.state.doc.textBetween(from, to, "|");
}

describe("Mod-k", () => {
  it("leaves an empty caret's Mod-k to the host search", async () => {
    const handle = await mountEditor("Badger sett.\n");
    const seen: KeyboardEvent[] = [];
    const host = (e: KeyboardEvent) => seen.push(e);
    window.addEventListener("keydown", host);
    try {
      handle.editor!.commands.setTextSelection(3);
      const e = press(handle, "k");
      expect(e.defaultPrevented).toBe(false);
      expect(seen).toHaveLength(1);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      window.removeEventListener("keydown", host);
    }
  });

  it("edits the link around an empty caret", async () => {
    const handle = await mountEditor("See [the sett](https://example.com) now.\n");
    handle.editor!.commands.setTextSelection(8);
    const e = press(handle, "k");
    expect(e.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
  });
});

describe("Mod-a", () => {
  it("selects the code block's text first and the document on the second press", async () => {
    const handle = await mountEditor("Before.\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\nAfter.\n");
    const doc = handle.editor!.state.doc;
    handle.editor!.commands.setTextSelection(doc.child(0).nodeSize + 3);
    press(handle, "a");
    expect(selected(handle)).toBe("const a = 1;\nconst b = 2;");
    press(handle, "a");
    expect(selected(handle)).toBe("Before.|const a = 1;\nconst b = 2;|After.");
  });

  it("selects the table cell's text first and the document on the second press", async () => {
    const handle = await mountEditor("| Sett | Count |\n| --- | --- |\n| North | 3 |\n");
    let cell = -1;
    handle.editor!.state.doc.descendants((n, pos) => {
      if (cell < 0 && n.isText && n.text === "North") cell = pos + 2;
    });
    handle.editor!.commands.setTextSelection(cell);
    press(handle, "a");
    expect(selected(handle)).toBe("North");
    press(handle, "a");
    expect(selected(handle)).toContain("Sett");
  });
});

describe("click away", () => {
  it("drops a block selection on a mousedown outside the editor but keeps it for the block's handle", async () => {
    const handle = await mountEditor("Intro.\n\n---\n\nOutro.\n");
    const view = handle.editor!.view;
    const hr = view.state.doc.child(0).nodeSize;
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, hr)));
    document.querySelector(".wy-gutter")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(view.state.selection).toBeInstanceOf(NodeSelection);
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(view.state.selection).not.toBeInstanceOf(NodeSelection);
  });

  it("drops a block selection when another block's own control in the content is pressed", async () => {
    const handle = await mountEditor("```js\nx\n```\n\n---\n");
    const view = handle.editor!.view;
    const hr = view.state.doc.child(0).nodeSize;
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, hr)));
    view.dom.querySelector(".wy-node-code .wy-block-tools button")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(view.state.selection).not.toBeInstanceOf(NodeSelection);
  });
});
