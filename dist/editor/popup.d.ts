import type { Editor } from "@tiptap/core";
import type { Component } from "vue";
import type { Placement } from "@floating-ui/dom";
export interface Popup {
    readonly element: HTMLElement;
    /** the component instance (its exposed members) */
    readonly ref: unknown;
    update(props: Record<string, unknown>): void;
    reposition(): void;
    close(): void;
}
/** a component floating at a caret rectangle, mounted in <body> like the slash menu */
export declare function openPopup(editor: Editor, component: Component, props: Record<string, unknown>, rect: () => DOMRect | null, placement?: Placement): Popup;
/** the caret rectangle of a document position */
export declare function caretRect(editor: Editor, pos: number): () => DOMRect | null;
