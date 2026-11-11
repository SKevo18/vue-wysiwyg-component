import { Extension } from "@tiptap/core";
import { type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DiffBlock, DocNode } from "./docdiff";
export interface DiffLabels {
    /** tag of a block that moved here */
    movedHere: string;
    /** tag of a block's old place */
    movedAway: string;
    /** tooltip of a block whose style or settings changed */
    changed: string;
}
/** Drops the node types and marks the schema lacks (a document saved by an editor with other extensions). */
export declare function fitSchema(node: DocNode, schema: Schema): DocNode | null;
/** The document a diff shows and the decorations that mark its changes. */
export declare function diffDocument(schema: Schema, diff: DiffBlock[], labels: DiffLabels): {
    doc: PMNode;
    decorations: Decoration[];
};
export declare const diffKey: PluginKey<DecorationSet>;
/** Holds the diff decorations of a DocDiffView's editor; a transaction with `diffKey` meta replaces them. */
export declare const DiffDecorations: Extension<any, any>;
