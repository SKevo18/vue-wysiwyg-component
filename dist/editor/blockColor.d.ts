import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { BlockRun } from "./convert";
/**
 * where a block colour of the run lands: each colourable block; inside a list or table, its items or cells; a first
 * child of a list item colours the item, as the markdown writes it
 */
export declare function colorTargets(state: EditorState, run: BlockRun): number[];
export declare function blockColorOf(state: EditorState, run: BlockRun): string;
export declare function setBlockColor(editor: Editor, run: BlockRun, token: string | null): void;
