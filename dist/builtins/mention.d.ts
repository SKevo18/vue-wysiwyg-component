import { Extension, type Editor } from "@tiptap/core";
import { type MentionAttrs } from "../core/mentions";
import type { EditorExtension, MentionSuggestion } from "../types";
export declare function mentionText(a: MentionAttrs, locale: string): string;
/** a picked user, date or page at `range`, followed by a space */
export declare function insertMention(editor: Editor, s: MentionSuggestion, range: {
    from: number;
    to: number;
}): void;
export declare const MentionSuggest: Extension<any, any>;
export declare function mentionExtension(): EditorExtension;
