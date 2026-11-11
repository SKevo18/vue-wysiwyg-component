import { Node } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import type { EditorExtension } from "../types";
/** `{color=…}` on the line after an atom fence */
export declare function writeColorLine(state: MarkdownSerializerState, node: PMNode): void;
export declare const TableOfContents: Node<any, any>;
export declare const tocExtension: EditorExtension;
