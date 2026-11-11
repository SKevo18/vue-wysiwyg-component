import { Extension } from "@tiptap/core";
/** node types that take a block colour; types missing from the schema are ignored */
export declare const BLOCK_COLOR_TYPES: string[];
export declare const PaletteTextStyle: import("@tiptap/core").Mark<import("@tiptap/extension-text-style").TextStyleOptions, any>;
export declare const PaletteColor: Extension<import("@tiptap/extension-text-style").ColorOptions, any>;
export declare const PaletteHighlight: import("@tiptap/core").Mark<import("@tiptap/extension-highlight").HighlightOptions, any>;
export declare const BlockColor: Extension<any, any>;
