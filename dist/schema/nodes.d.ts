import { Extension, Node } from "@tiptap/core";
import { Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
/** a palette token from `data-color`; html may carry other colors, which stay out of the palette attribute */
export declare function paletteAttribute(): {
    default: null;
    parseHTML: (dom: HTMLElement) => string | null;
    renderHTML: (a: {
        color?: string | null;
    }) => {
        "data-color": string;
    } | {
        "data-color"?: undefined;
    };
};
export declare const InlineImage: Node<import("@tiptap/extension-image").ImageOptions, any>;
export declare const Figure: Node<any, any>;
export declare const Callout: Node<any, any>;
export declare const Divider: Node<import("@tiptap/extension-horizontal-rule").HorizontalRuleOptions, any>;
export declare const ListStyles: Extension<any, any>;
export declare const FileChips: Extension<any, any>;
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        codeWrap: {
            /** turns line wrapping of the code block at the selection on or off (the `nowrap` word of its fence info) */
            toggleCodeWrap: () => ReturnType;
        };
    }
}
export declare const GenericCodeBlock: Node<import("@tiptap/extension-code-block").CodeBlockOptions, any>;
export declare function flattenToParagraph(content: Fragment, schema: Schema): PMNode;
export declare const InlineTableCell: Node<import("@tiptap/extension-table").TableCellOptions, any>;
export declare const InlineTableHeader: Node<import("@tiptap/extension-table").TableHeaderOptions, any>;
export declare const InlineDocument: Node<any, any>;
