import { Extension, Node, type Editor } from "@tiptap/core";
import { type EditorState } from "@tiptap/pm/state";
/** a section (a tab): `label` is the text after `==== `. isolating, so Backspace never merges two sections */
export declare function sectionNode(name: string): Node<any, any>;
export declare const TabsActive: Extension<any, any>;
/** index of the shown section of the container at `pos`, clamped to its children */
export declare function activeSection(state: EditorState, pos: number): number;
export declare function selectSection(editor: Editor, pos: number, index: number): void;
export declare function setSectionLabel(editor: Editor, pos: number, index: number, label: string): void;
/** an empty section at `index` (0..childCount) with the caret in it */
export declare function addSection(editor: Editor, pos: number, index: number): void;
/** removes section `index` unless it is the last one; the caret moves to the neighbour */
export declare function removeSection(editor: Editor, pos: number, index: number): void;
/** swaps section `index` with its neighbour in direction `dir`; the caret follows the moved section */
export declare function moveSection(editor: Editor, pos: number, index: number, dir: -1 | 1): void;
