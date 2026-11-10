import { Extension, type Editor } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { SlashItem } from "../types";
export declare const BLOCK_EDIT_EVENT = "wy-block-edit";
export declare function blockStopEvent({ event }: {
    event: Event;
}): boolean;
/** script and data urls become "" */
export declare function normalizeHref(raw: string): string;
export declare function linkAtSelection(editor: Editor): {
    href: string;
    text: string;
    hasLink: boolean;
};
export declare function applyLink(editor: Editor, rawHref: string, text: string): void;
export declare function removeLink(editor: Editor): void;
export declare const SLASH_KEY: PluginKey<any>;
interface SlashOptions {
    items(query: string): SlashItem[];
    groupLabel(id: string): string;
    t(key: string): string;
}
export declare const SlashCommand: Extension<SlashOptions, any>;
export declare const BlockKeys: Extension<any, any>;
export declare const InlineKeys: Extension<any, any>;
/** a click right of an inline atom that ends its line puts the caret after it (firefox puts it before) */
export declare const InlineAtomClick: Extension<any, any>;
export declare const TableCells: Extension<any, any>;
export declare const HostKeys: Extension<{
    keys: () => Record<string, () => boolean>;
}, any>;
export {};
