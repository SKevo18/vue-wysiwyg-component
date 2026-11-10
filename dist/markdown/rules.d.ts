import type { StateCore, StateInline, Token } from "markdown-it";
import { type ImageAttrs } from "../core/media";
import type { FenceRule } from "../types";
export interface FigureMeta extends ImageAttrs {
    image: Token;
    caption: string;
}
export declare function imageAttrsRule(state: StateInline, silent: boolean): boolean;
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
