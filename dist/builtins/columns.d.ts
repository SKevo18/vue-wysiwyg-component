import { Node } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorExtension } from "../types";
export declare const MIN_COLUMN_WIDTH = 10;
/** a column width in percent, at most two decimals; null shares the rest equally */
export declare function parseColumnWidth(v: unknown): number | null;
export declare function formatColumnWidth(w: number): string;
/** each column's share in percent of the row; columns without a width split what the others leave */
export declare function columnShares(columns: PMNode): number[];
export declare const Columns: Node<any, any>;
export declare const Column: Node<any, any>;
export declare const columnsExtension: EditorExtension;
