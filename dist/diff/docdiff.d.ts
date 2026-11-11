import type { Schema } from "@tiptap/pm/model";
/** A ProseMirror mark as JSON. */
export interface DocMark {
    type: string;
    attrs?: Record<string, unknown>;
}
/** A ProseMirror node as JSON (`node.toJSON()`, `editor.getJSON()`). */
export interface DocNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: DocNode[];
    text?: string;
    marks?: DocMark[];
}
export type DiffChange = "same" | "added" | "removed";
/** A run of text, or an inline atom such as a hard break or a mention, in a text block. */
export type DiffInline = {
    kind: "text";
    text: string;
    marks: DocMark[];
    change: DiffChange;
} | {
    kind: "atom";
    node: DocNode;
    change: DiffChange;
};
export interface DiffBlock {
    /** the node to show: the newer one, or the older one when removed */
    node: DocNode;
    change: DiffChange | "modified";
    /** modified blocks: the older node */
    before?: DocNode;
    /** removed here and added unchanged elsewhere, or the reverse */
    moved?: boolean;
    /** a modified block whose own attributes changed (heading level, checked task, cell color) */
    attrsChanged?: boolean;
    /** text blocks: their inline content, word-diffed when modified */
    inline?: DiffInline[];
    /** containers: their child blocks, diffed when modified */
    children?: DiffBlock[];
}
export interface DiffOptions {
    /** decides which node types are inline and which are text blocks; without it the base schema's names are assumed */
    schema?: Schema;
    /** blocks compared as a whole: any change to their content shows the old block removed and the new one added.
     *  Default: mermaid and plantuml code blocks */
    atomic?(node: DocNode): boolean;
}
/** A code block in a diagram language: it shows as its picture, so a changed source is a changed picture. */
export declare function isDiagram(n: DocNode): boolean;
/** A JSON string with sorted keys: equal nodes give equal keys. */
export declare function canonical(v: unknown): string;
/** Dice coefficient of two texts' word multisets, 0…1. */
export declare function similarity(a: string, b: string): number;
/** Diffs two documents (or containers). `before` null shows every block of `after` as added. */
export declare function diffDocs(before: DocNode | null, after: DocNode, options?: DiffOptions): DiffBlock[];
/** Whether a diff shows any change. */
export declare function diffHasChanges(blocks: readonly DiffBlock[]): boolean;
/** Word-level diff of two text blocks' inline content. A formatting change shows as the old words removed and the
 *  newly formatted ones added. */
export declare function diffInline(a: DocNode[], b: DocNode[]): DiffInline[];
