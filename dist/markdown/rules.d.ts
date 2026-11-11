import type { StateCore, StateInline, Token } from "markdown-it";
import { type ImageAttrs } from "../core/media";
import type { FenceRule } from "../types";
export interface FigureMeta extends ImageAttrs {
    image: Token;
    caption: string;
}
export declare function imageAttrsRule(state: StateInline, silent: boolean): boolean;
export interface SpanColors {
    /** text token, `red` */
    color: string | null;
    /** background token, `yellow_bg` */
    bg: string | null;
}
/** `color=red bg=yellow`; `bg` also takes `yellow_bg`, `color` also takes a background token */
export declare function parseSpanAttrs(fields: Record<string, string>): SpanColors | null;
/**
 * `[text]{color=red bg=yellow}`: text colour and background colour marks around the bracketed inline content.
 * silent mode (markdown-it scanning a link label) never matches, so a link label may hold a span:
 * `[[a]{color=red} b](/p/1)`. a matched span would read as a nested link and void the outer link
 */
export declare function colorSpanRule(state: StateInline, silent: boolean): boolean;
/**
 * a span nested in a span of the same mark (`[a [b]{color=red} c]{color=blue}`, `==a [b]{bg=yellow} c==`):
 * the inner one wins over its own text and the outer one resumes after it. the parser would otherwise drop
 * the outer mark at the inner close
 */
export declare function sameMarkNestingRule(state: StateCore): void;
export declare function figureRule(state: StateCore): void;
/** an all-empty header row is dropped (that is how a headerless table is written); `\<br>` stays text; must run before `text_join` */
export declare function tableCellsRule(state: StateCore): void;
export declare function retagCallouts(tokens: Token[], kinds: readonly string[]): void;
export declare function retagTaskLists(tokens: Token[]): void;
export declare function wrapTableCells(state: StateCore, tokens: Token[]): void;
export declare function atomToken(node: string): string;
export interface RetagOptions {
    callouts: readonly string[];
    taskLists: boolean;
    tables: boolean;
    fences: readonly FenceRule[];
    hooks: ((tokens: Token[], ctx: {
        Token: typeof Token;
    }) => void)[];
}
/** runs on the block stream before the inline rule so nested container bodies are retagged too and their inline content is parsed once by the outer core chain */
export declare function retagTokens(state: StateCore, tokens: Token[], opts: RetagOptions): void;
