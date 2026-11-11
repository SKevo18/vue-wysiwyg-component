// mod+z steps the local history first; once it is exhausted (or only holds remapped steps) the bridge steps the server history.
// in collaboration mode the collaboration extension's undo/redo commands (y-undo, this client's changes only) take over.
import { Extension, type CommandProps, type Editor } from "@tiptap/core";
import { TextSelection, type EditorState } from "@tiptap/pm/state";
import { redo, undo } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface HistoryBridge {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): Promise<void>;
  redo(): Promise<void>;
}

interface CaptureManager {
  captureTimeout: number;
  stopCapturing(): void;
}

function isCaptureManager(v: unknown): v is CaptureManager {
  return !!v && typeof v === "object" && "captureTimeout" in v && "stopCapturing" in v && typeof v.stopCapturing === "function";
}

/**
 * Records every local change as one step of a collaborative (Yjs) undo history until the returned function runs,
 * however long the pauses between them (Yjs merges changes only within its capture timeout). Null without one.
 */
export function captureUndo(state: EditorState): (() => void) | null {
  // the collaboration extension's undo plugin, found by its key so the base needs no Yjs dependency
  const plugin = state.plugins.find((p) => "key" in p && typeof p.key === "string" && p.key.startsWith("y-undo$"));
  const pluginState: unknown = plugin?.getState(state);
  const manager = pluginState && typeof pluginState === "object" && "undoManager" in pluginState ? pluginState.undoManager : null;
  if (!isCaptureManager(manager)) return null;
  manager.stopCapturing();
  const timeout = manager.captureTimeout;
  manager.captureTimeout = Number.POSITIVE_INFINITY;
  return () => {
    manager.captureTimeout = timeout;
    manager.stopCapturing();
  };
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
