import { Extension, Node } from "@tiptap/core";
import { type MentionAttrs } from "../core/mentions";
import type { EditorExtension, ResolvedBase } from "../types";
export declare function mentionText(a: MentionAttrs, locale: string): string;
export declare const Mention: Node<{
    pageHref: string;
}, any>;
export declare const MentionSuggest: Extension<any, any>;
export declare function mentionExtension(base: ResolvedBase): EditorExtension;
