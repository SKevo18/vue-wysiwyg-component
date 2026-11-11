import { Extension, type Editor } from "@tiptap/core";
import { type EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
export interface HistoryBridge {
    canUndo(): boolean;
    canRedo(): boolean;
    undo(): Promise<void>;
    redo(): Promise<void>;
}
/**
 * Records every local change as one step of a collaborative (Yjs) undo history until the returned function runs,
 * however long the pauses between them (Yjs merges changes only within its capture timeout). Null without one.
 */
export declare function captureUndo(state: EditorState): (() => void) | null;
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        serverHistory: {
            historyUndo: () => ReturnType;
            historyRedo: () => ReturnType;
        };
    }
}
/** outside the local history and without an update event, keeping the caret where it was */
export declare function replaceDocument(editor: Editor, doc: PMNode): void;
export declare const ServerHistory: Extension<{
    bridge: () => HistoryBridge | null;
    collaborative: boolean;
}, any>;
