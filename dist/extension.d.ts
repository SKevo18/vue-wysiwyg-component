import { Node } from "@tiptap/core";
import type { Component } from "vue";
import { type FenceInfo } from "./core/info";
import type { ConvertHooks, EditorExtension, EditorFormat, SlashItemDef } from "./types";
export declare function defineEditorExtension(extension: EditorExtension): EditorExtension;
/** never `draggable` (the gutter grip drags blocks), so the caret can enter inputs of its node view. */
export declare function fenceAtom(name: string, kind: string): Node<any, any>;
export interface FenceBlockOptions {
    kind: string;
    /** default `<kind>Block` */
    node?: string;
    match?: (info: FenceInfo) => boolean;
    ensureId?: boolean;
    view?: Component;
    slash?: Omit<SlashItemDef, "run" | "id"> & {
        id?: string;
        attrs?: Record<string, string>;
        body?: string;
    };
    convert?: ConvertHooks;
    formats?: EditorFormat[];
    messages?: EditorExtension["messages"];
}
/** parse and serialize keep fence attributes and body byte for byte. */
export declare function defineFenceBlock(options: FenceBlockOptions): EditorExtension;
