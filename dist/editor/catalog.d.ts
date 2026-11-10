import type { Editor, Range } from "@tiptap/core";
import type { EditorConfig } from "../schema";
import type { EditorServices, SlashContext, SlashGroupDef, SlashItem, SlashItemDef } from "../types";
import type { FileController } from "./context";
export declare const BASE_GROUPS: SlashGroupDef[];
export declare function slashContext(editor: Editor, range: Range | undefined, services: EditorServices): SlashContext;
export declare function slashCatalog(config: EditorConfig, files: FileController, services: EditorServices, text: (label: SlashItemDef["label"] | undefined, key?: string) => string): SlashItem[];
export declare function groupLabel(config: EditorConfig, id: string, text: (label: SlashItemDef["label"] | undefined, key?: string) => string): string;
export declare function filterItems(items: SlashItem[], query: string): SlashItem[];
