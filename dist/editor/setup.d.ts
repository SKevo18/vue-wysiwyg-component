import { type Extensions } from "@tiptap/core";
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
}
export declare function editorExtensions(ctx: EditorContext, opts: SetupOptions): Extensions;
