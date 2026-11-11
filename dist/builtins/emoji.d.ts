import { Extension, type Editor } from "@tiptap/core";
import type { EditorExtension } from "../types";
export declare const EmojiSuggest: Extension<any, any>;
/** the full picker at `at`; the picked emoji goes there */
export declare function openEmojiPicker(editor: Editor, at: number): void;
export declare const emojiExtension: EditorExtension;
