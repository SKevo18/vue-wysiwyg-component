import { Extension, type Editor } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { EditorServices, SlashItem } from "../types";
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
/** the host's `openLink` first (it returns true for routes it handles), otherwise a new tab without an opener */
export declare function openHref(services: EditorServices, raw: string, event: MouseEvent): void;
/**
 * A plain click on a link opens it in editable and readonly editors; dragging, shift and multi clicks select text. A
 * link to a heading of this document (`#Heading`) scrolls to it. Blocks that follow their own links (a bookmark, a page
 * link, the table of contents) prevent the click's default, so the editor leaves it alone.
 */
export declare const LinkClicks: Extension<{
    open(href: string, event: MouseEvent): void;
}, any>;
export declare const SLASH_KEY: PluginKey<any>;
interface SlashOptions {
    items(query: string): SlashItem[];
    groupLabel(id: string): string;
    t(key: string): string;
}
export declare const SlashCommand: Extension<SlashOptions, any>;
export declare const BlockKeys: Extension<any, any>;
export declare const InlineKeys: Extension<any, any>;
/** Mod-a in a code block or table cell selects that block's text first; the next Mod-a selects the document */
export declare const ScopedSelectAll: Extension<any, any>;
/**
 * A mousedown anywhere but the selected block (outside the editor, in another block's own controls such as an embedded
 * database or a form field) drops a block selection, so no block stays highlighted once the user works elsewhere.
 */
export declare const ClickAway: Extension<any, any>;
/** a click right of an inline atom that ends its line puts the caret after it (firefox puts it before) */
export declare const InlineAtomClick: Extension<any, any>;
export declare const TableCells: Extension<any, any>;
export declare const HostKeys: Extension<{
    keys: () => Record<string, () => boolean>;
}, any>;
export {};
