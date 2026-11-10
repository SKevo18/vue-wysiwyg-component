import type { Node as PMNode } from "@tiptap/pm/model";
import type { BaseOptions, EditorExtension, EditorFormat } from "./types";
export interface ConvertOptions {
    extensions?: readonly EditorExtension[];
    base?: BaseOptions;
    format?: EditorFormat;
}
export declare function convertTargets(blocks: readonly PMNode[], options?: ConvertOptions): string[];
export declare function convertBlocks(blocks: readonly PMNode[], target: string, options?: ConvertOptions): PMNode[] | null;
