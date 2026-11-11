import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
export interface TocEntry {
    pos: number;
    level: number;
    text: string;
}
/** headings and toggle headings in document order */
export declare function tocEntries(doc: PMNode): TocEntry[];
/** The heading a same-document link (`#Setts and dens` or `#setts-and-dens`) points at: its exact text first, then its slug. */
export declare function headingFor(doc: PMNode, hash: string): TocEntry | null;
/** Brings the heading at `pos` to the top of its scroll container. */
export declare function scrollToHeading(view: EditorView, pos: number): void;
