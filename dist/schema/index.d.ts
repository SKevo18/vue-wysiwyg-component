import { type Extensions } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import type { BaseOptions, EditorExtension, EditorFormat, ResolvedBase } from "../types";
export declare function resolveBase(format: EditorFormat, base?: BaseOptions): ResolvedBase;
export interface EditorConfig {
    format: EditorFormat;
    base: ResolvedBase;
    extensions: EditorExtension[];
}
/** shared default, so callers without extensions hit the same cache entry */
export declare const NO_EXTENSIONS: readonly EditorExtension[];
export declare function resolveConfig(format: EditorFormat, base: BaseOptions | undefined, extensions?: readonly EditorExtension[]): EditorConfig;
export declare function schemaExtensions(config: EditorConfig, inline?: boolean): Extensions;
export declare function schemaFor(config: EditorConfig, inline?: boolean): Schema;
