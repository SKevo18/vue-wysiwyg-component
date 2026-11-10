import { type AnyExtension, type Extensions } from "@tiptap/core";
import { type EditorContext } from "./context";
import { type HistoryBridge } from "./history";
export interface SetupOptions {
    placeholder: string;
    gutter: {
        onInsertAfter(pos: number): void;
        onMenu(pos: number, grip: HTMLElement): void;
        menuOpen(): boolean;
    } | null;
    bridge(): HistoryBridge | null;
    hostKeys(): Record<string, () => boolean>;
    /** the host's collaboration extensions; they replace the local undo history and own the document */
    collaboration: AnyExtension[] | null;
}
export declare function editorExtensions(ctx: EditorContext, opts: SetupOptions): Extensions;
