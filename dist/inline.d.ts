import { Extension, Node, type AnyExtension } from "@tiptap/core";
import type { TagParseRule } from "@tiptap/pm/model";
import type { StateInline } from "markdown-it";
import type { Component } from "vue";
import type { EditorExtension, EditorFormat, SlashItemDef } from "./types";
export type InlineAttrValue = string | number | boolean | null;
export interface InlineSyntax {
    /**
     * tried at every inline position where markdown-it stops for a special character, so it has to start with one of
     * `` \n ! # $ % & * + - : < = > @ [ \ ] ^ _ ` { } ~ ``. it is made sticky; a match must not span lines
     */
    pattern: RegExp;
    /** attributes of the chip from a match; null leaves the text to the other rules */
    parse(match: RegExpExecArray): Record<string, unknown> | null;
    /** the chip's markdown; null writes its `text` */
    serialize(attrs: Record<string, unknown>): string | null;
    /** the markdown-it inline rule this one runs before, default `link` */
    before?: string;
}
export interface InlineBlockOptions {
    /** node name */
    name: string;
    /** attributes and their defaults. html keeps each as `data-<name>` (kebab case), numbers and booleans as text */
    attrs: Record<string, InlineAttrValue>;
    /** what a reader sees without the view: html fallback, plain text, copy */
    text(attrs: Record<string, unknown>): string;
    /** the Vue view; wrap it in `InlineChip` for the shared chip look and selection styling */
    view?: Component;
    /** html element: a `span`, or an `a` when `href` returns an address */
    html?: {
        class?: string | ((attrs: Record<string, unknown>) => string);
        href?: (attrs: Record<string, unknown>) => string | null;
        /** more parse rules, e.g. an older element of the same chip */
        parse?: TagParseRule[];
    };
    markdown?: InlineSyntax;
    slash?: SlashItemDef[];
    formats?: EditorFormat[];
    messages?: EditorExtension["messages"];
    /** more tiptap extensions shipped with the chip (an input rule, a suggestion menu) */
    tiptap?: AnyExtension[];
}
/** markdown-it inline rule producing a `<token>` with the parsed attributes as meta */
export declare function inlineSyntaxRule(syntax: InlineSyntax, token: string): (state: StateInline, silent: boolean) => boolean;
/** the inline atom node of an inline block, without its markdown and view */
export declare function inlineBlockNode(o: Pick<InlineBlockOptions, "name" | "attrs" | "text" | "html">): Node<any, any>;
/** the markdown-it token of an inline block, e.g. for `FenceContext.inline` */
export declare function inlineBlockToken(name: string): string;
/**
 * A chip-like inline atom: an inline node with a Vue view that a caret steps over like one character (arrow keys
 * move past it, Backspace and Delete remove it, text types before and after it) and an optional inline markdown
 * syntax. Base page links and mentions are built with it; hosts use it for their own chips.
 */
export declare function defineInlineBlock(o: InlineBlockOptions): EditorExtension;
/** keyboard behaviour of chips without the rest (for a host chip node built elsewhere) */
export declare function inlineChipKeys(name: string): Extension<any, any>;
/** `[`, `]` and `\` escaped, line breaks as spaces: a label inside `@[…]` */
export declare function escapeChipLabel(label: string): string;
/** the label of an `@[label](…)` match with its escapes resolved */
export declare function unescapeChipLabel(label: string): string;
/** `@[label](target)`: group 1 the escaped label, group 2 the target (no spaces or parentheses) */
export declare const AT_LINK: RegExp;
