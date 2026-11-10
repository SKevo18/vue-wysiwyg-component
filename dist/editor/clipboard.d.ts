import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { type MarkdownConverter } from "../markdown";
export declare function looksLikeMarkdown(text: string): boolean;
export declare function pasteAsMarkdown(text: string, html: string): boolean;
export declare function clipboardText(slice: Slice, markdown: MarkdownConverter): string;
/** keeps text alignment but drops every other style; the editor's own html (`data-pm-slice`) passes untouched */
export declare function cleanPastedHtml(html: string): string;
export declare function clipboardExtension(markdown: MarkdownConverter, copyMarkdown: boolean): Extension<any, any>;
