import type { Node as PMNode } from "@tiptap/pm/model";
import { type EditorState, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
/** marks a block drag in `dataTransfer.types` */
export declare const BLOCK_DRAG_TYPE = "application/x-wysiwyg-block";
/** a boundary between blocks: `pos` in the document and the guide line in viewport coordinates */
export interface DropSpot {
    pos: number;
    left: number;
    right: number;
    y: number;
}
/**
 * The boundary a block dropped at `x`/`y` lands on: the deepest container under the pointer that accepts the node, so
 * a block can go into a column, a callout, a toggle or a list item. Left of the content only the top level counts,
 * unless the node does not fit there (a list item stays in a list).
 */
export declare function dropSpot(view: EditorView, x: number, y: number, node: PMNode, from: number): DropSpot | null;
/** moves the block at `from` to the boundary `to` in one transaction; null when that would change nothing */
export declare function moveBlock(state: EditorState, from: number, to: number): Transaction | null;
export interface BlockDragSource {
    /** the dragged block's current position, kept up to date through document changes; null when it is gone */
    pos(): number | null;
}
export declare class BlockDrag {
    private guide;
    private source;
    private view;
    private container;
    private onStop;
    constructor(view: EditorView, container: () => HTMLElement | null, onStop: () => void);
    get dragging(): boolean;
    start(source: BlockDragSource): void;
    stop(): void;
    destroy(): void;
    /** the boundary under the pointer, null outside the editor column */
    spotAt(x: number, y: number): DropSpot | null;
    private show;
    private onOver;
    private onLeave;
    private onDrop;
    private onEnd;
}
