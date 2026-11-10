import type { Component } from "vue";
import { type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { type EditorState, type Transaction } from "@tiptap/pm/state";
import type { MarkdownConverter } from "../markdown";
import type { EditorConfig } from "../schema";
import type { ContainerSpec, ConvertContext, ConvertItem, MaybeText } from "../types";
type Blocks = readonly PMNode[];
interface InternalContext extends ConvertContext {
    isContainer(n: PMNode): boolean;
    isSections(n: PMNode): boolean;
    flattenSections(node: PMNode): PMNode[];
    hasItems(n: PMNode): boolean;
}
type Transform = (blocks: Blocks, ctx: InternalContext) => PMNode[] | null;
export interface ResolvedTarget {
    id: string;
    label: MaybeText;
    icon: Component | undefined;
    rank: number;
}
export interface ConvertRegistry {
    targets: ResolvedTarget[];
    transforms: Map<string, Transform[]>;
    convertible: Set<string>;
    wrappable: Set<string>;
    containers: Map<string, ContainerSpec>;
    sections: Map<string, string>;
    items: Map<string, (node: PMNode, ctx: ConvertContext) => ConvertItem[]>;
    paragraphs: Map<string, (node: PMNode, ctx: ConvertContext) => PMNode[] | null>;
    markdown: MarkdownConverter;
}
export declare function convertRegistry(config: EditorConfig, markdown: MarkdownConverter): ConvertRegistry;
export declare function convertBlocks(reg: ConvertRegistry, blocks: Blocks, target: string, schema: Schema): PMNode[] | null;
export declare function convertTargets(reg: ConvertRegistry, blocks: Blocks, schema: Schema, fits?: (nodes: PMNode[]) => boolean): ResolvedTarget[];
export interface BlockRun {
    from: number;
    to: number;
    nodes: PMNode[];
}
export declare function selectionRun(state: EditorState): BlockRun | null;
export declare function nodeRun(state: EditorState, pos: number): BlockRun | null;
export declare function runTargets(reg: ConvertRegistry, state: EditorState, run: BlockRun): ResolvedTarget[];
export declare function convertRun(reg: ConvertRegistry, state: EditorState, run: BlockRun, target: string, selectAll?: boolean): Transaction | null;
export {};
