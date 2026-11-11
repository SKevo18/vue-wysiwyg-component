import { Node, mergeAttributes } from "@tiptap/core";
import TocView from "../nodes/TocView.vue";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import { ListTree } from "@lucide/vue";
import { formatBlockAttrs } from "../core/attrs";
import type { EditorExtension } from "../types";
import { paletteAttribute } from "../schema/nodes";

/** `{color=…}` on the line after an atom fence */
export function writeColorLine(state: MarkdownSerializerState, node: PMNode) {
  const attrs = formatBlockAttrs({ color: node.attrs.color });
  if (!attrs) return;
  (state as MarkdownSerializerState & { flushClose(size: number): void }).flushClose(1);
  state.write(attrs);
  state.closeBlock(node);
}

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return { color: paletteAttribute() };
  },
  parseHTML() {
    return [{ tag: 'nav[data-type="toc"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["nav", mergeAttributes({ "data-type": "toc", class: "wy-toc" }, HTMLAttributes)];
  },
});

export const tocExtension: EditorExtension = {
  name: "tableOfContents",
  tiptap: [TableOfContents],
  nodeViews: { tableOfContents: TocView },
  markdown: {
    fences: [{ kind: "toc", parse: (ctx) => ctx.atom("table_of_contents", {}) }],
    tokens: { table_of_contents: { node: "tableOfContents", getAttrs: (tok) => ({ color: tok.meta.blockAttrs?.color ?? null }) } },
    nodes: {
      tableOfContents(state, node, _parent, _index, h) {
        h.writeFence(state, node, "toc", "");
        writeColorLine(state, node);
      },
    },
  },
  slash: [{ id: "tableOfContents", group: "blocks", rank: 40, label: "", icon: ListTree, keywords: "toc contents outline headings", run: (c) => c.insert("tableOfContents", {}) }],
};
