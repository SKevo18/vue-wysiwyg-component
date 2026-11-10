import type { Editor } from "@tiptap/core";
import { Slice, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { type EditorState } from "@tiptap/pm/state";
export declare function isInCell($pos: ResolvedPos): boolean;
export declare function cellSlice(slice: Slice, state: EditorState): Slice;
export interface TableRef {
    pos: number;
    node: PMNode;
}
export type ColumnAlign = "left" | "center" | "right";
export declare function selectLine(editor: Editor, table: TableRef, kind: "col" | "row", index: number): boolean;
export type TableAction = {
    kind: "col";
    index: number;
    action: "before" | "after" | "delete" | ColumnAlign;
} | {
    kind: "row";
    index: number;
    action: "before" | "after" | "delete" | "header";
} | {
    kind: "table";
    action: "addCol" | "addRow" | "delete";
};
export declare function runTableAction(editor: Editor, table: TableRef, a: TableAction): void;
/** the header row stays first: gfm writes it above the `---` line, so it neither moves nor gets displaced */
export declare function moveLine(editor: Editor, table: TableRef, kind: "col" | "row", from: number, to: number): boolean;
export declare function hasHeaderRow(table: PMNode): boolean;
