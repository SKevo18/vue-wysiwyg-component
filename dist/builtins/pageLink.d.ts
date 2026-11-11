import type { Editor } from "@tiptap/core";
import type { EditorExtension, MentionSuggestion, ResolvedBase } from "../types";
export interface PageLinkAttrs {
    href: string;
    title: string;
    icon: string;
}
/** a page link target in markdown: a path, an http(s) address or `page:<id>` */
export declare const PAGE_HREF: RegExp;
/** `@[Title](href)`; the href percent encodes spaces and parentheses */
export declare function pageLinkMarkdown(a: PageLinkAttrs): string | null;
/** where a page link goes: `page:<id>` through `base.pageHref`, other addresses as they are */
export declare function pageTarget(href: string, template: string): string;
/** a page chip for a picked page at the caret, with a space after it when `space` */
export declare function insertPageLink(editor: Editor, s: MentionSuggestion, range: {
    from: number;
    to: number;
}, space: boolean): void;
/** "Link to page": search pages and insert a page chip at `at` */
export declare function openPageSearch(editor: Editor, at: number): void;
export declare function pageLinkExtension(base: ResolvedBase): EditorExtension;
