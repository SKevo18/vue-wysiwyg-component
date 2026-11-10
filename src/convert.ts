import type { Node as PMNode } from "@tiptap/pm/model";
import { markdownFor } from "./markdown";
import { resolveConfig, type EditorConfig } from "./schema";
import { convertBlocks as convertWith, convertRegistry, convertTargets as targetsWith, type ConvertRegistry } from "./editor/convert";
import type { BaseOptions, EditorExtension, EditorFormat } from "./types";

export interface ConvertOptions {
  extensions?: readonly EditorExtension[];
  base?: BaseOptions;
  format?: EditorFormat;
}

const registries = new WeakMap<EditorConfig, ConvertRegistry>();

function registry(options: ConvertOptions): ConvertRegistry {
  const config = resolveConfig(options.format ?? "markdown", options.base, options.extensions);
  let reg = registries.get(config);
  if (!reg) registries.set(config, (reg = convertRegistry(config, markdownFor(config))));
  return reg;
}

export function convertTargets(blocks: readonly PMNode[], options: ConvertOptions = {}): string[] {
  if (!blocks.length) return [];
  return targetsWith(registry(options), blocks, blocks[0]!.type.schema).map((t) => t.id);
}

export function convertBlocks(blocks: readonly PMNode[], target: string, options: ConvertOptions = {}): PMNode[] | null {
  if (!blocks.length) return null;
  return convertWith(registry(options), blocks, target, blocks[0]!.type.schema);
}
