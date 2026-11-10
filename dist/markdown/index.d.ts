import { Slice, type Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { type EditorConfig } from "../schema";
import type { BaseOptions, EditorExtension } from "../types";
export interface MarkdownConverter {
    readonly config: EditorConfig;
    readonly schema: Schema;
    readonly inlineSchema: Schema;
    parse(md: string, schema?: Schema): PMNode;
    parseInline(md: string, schema?: Schema): PMNode;
    serialize(doc: PMNode): string;
    serializeInline(doc: PMNode): string;
    serializeNode(node: PMNode): string;
    slice(md: string, schema?: Schema): Slice;
    toHtml(md: string): string;
}
export declare function fragmentHtml(content: Fragment, schema: Schema): string;
export declare function fragmentMarkdown(markdown: MarkdownConverter, content: Fragment | readonly PMNode[], schema: Schema): string;
export declare function markdownFor(config: EditorConfig): MarkdownConverter;
export declare function createMarkdown(extensions?: readonly EditorExtension[], options?: {
    base?: BaseOptions;
}): MarkdownConverter;
