import { Extension, type Editor } from "@tiptap/core";
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
export declare function replaceDocument(editor: Editor, doc: PMNode): void;
export declare const ServerHistory: Extension<{
    bridge: () => HistoryBridge | null;
}, any>;
