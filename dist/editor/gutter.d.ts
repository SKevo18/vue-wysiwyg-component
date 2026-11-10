import { Extension } from "@tiptap/core";
interface GutterHandleOptions {
    onInsertAfter(pos: number): void;
    onMenu(pos: number, grip: HTMLElement): void;
    menuOpen(): boolean;
    labels(): {
        drag: string;
        add: string;
    };
}
export declare const GutterHandle: Extension<GutterHandleOptions, any>;
export {};
