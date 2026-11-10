// mod+z steps the local history first; once it is exhausted (or only holds remapped steps) the bridge steps the server history.
// in collaboration mode the collaboration extension's undo/redo commands (y-undo, this client's changes only) take over.
import { Extension, type CommandProps, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { redo, undo } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface HistoryBridge {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): Promise<void>;
  redo(): Promise<void>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    serverHistory: {
      historyUndo: () => ReturnType;
      historyRedo: () => ReturnType;
    };
  }
}

/** outside the local history and without an update event, keeping the caret where it was */
export function replaceDocument(editor: Editor, doc: PMNode) {
  const { state, view } = editor;
  const from = state.selection.from;
  const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content).setMeta("addToHistory", false).setMeta("preventUpdate", true);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(from, tr.doc.content.size)), -1));
  view.dispatch(tr);
}

export const ServerHistory = Extension.create<{ bridge: () => HistoryBridge | null; collaborative: boolean }>({
  name: "serverHistory",
  addOptions() {
    return { bridge: () => null, collaborative: false };
  },
  addCommands() {
    if (this.options.collaborative) {
      return {
        historyUndo: () => ({ commands }) => commands.undo?.() ?? false,
        historyRedo: () => ({ commands }) => commands.redo?.() ?? false,
      };
    }
    // the local step runs on the command's own transaction; the bridge dispatches on its own after this returns
    const step =
      (dir: "undo" | "redo") =>
      () =>
      ({ state, dispatch, tr }: CommandProps) => {
        const before = tr.doc;
        const local = (dir === "undo" ? undo : redo)(state, dispatch);
        if (local && !tr.doc.eq(before)) return true;
        const bridge = this.options.bridge();
        if (!bridge || (dir === "undo" ? !bridge.canUndo() : !bridge.canRedo())) return false;
        if (dispatch) queueMicrotask(() => void (dir === "undo" ? bridge.undo() : bridge.redo()));
        return true;
      };
    return { historyUndo: step("undo"), historyRedo: step("redo") };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.historyUndo(),
      "Mod-Shift-z": () => this.editor.commands.historyRedo(),
      "Mod-y": () => this.editor.commands.historyRedo(),
    };
  },
});
