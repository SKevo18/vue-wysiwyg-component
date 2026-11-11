import { Node } from "@tiptap/core";
import type { EditorExtension } from "../types";
export declare const BOOKMARK_FIELDS: readonly ["url", "title", "description", "image", "icon", "site"];
export type BookmarkAttrs = Record<(typeof BOOKMARK_FIELDS)[number], string>;
export declare function siteName(url: string): string;
export declare const Bookmark: Node<any, any>;
export declare const bookmarkExtension: EditorExtension;
