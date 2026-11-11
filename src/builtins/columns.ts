import { Node, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Columns2, Columns3, Columns4 } from "@lucide/vue";
import { joinSections, type Section } from "../core/info";
import type { EditorExtension, SlashItemDef } from "../types";

export const MIN_COLUMN_WIDTH = 10;

/** a column width in percent, at most two decimals; null shares the rest equally */
export function parseColumnWidth(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= 100 ? n : null;
}

export function formatColumnWidth(w: number): string {
  return String(Math.round(w * 100) / 100);
}

/** each column's share in percent of the row; columns without a width split what the others leave */
export function columnShares(columns: PMNode): number[] {
  const widths: (number | null)[] = [];
  columns.forEach((c) => widths.push(parseColumnWidth(c.attrs.width)));
  const fixed = widths.reduce<number>((s, w) => s + (w ?? 0), 0);
  const free = widths.filter((w) => w === null).length;
  const rest = free ? Math.max(MIN_COLUMN_WIDTH, (100 - fixed) / free) : 0;
  return widths.map((w) => w ?? rest);
}

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column+",
  defining: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes({ "data-type": "columns", class: "wy-columns", style: `--wy-columns: ${node.childCount}` }, HTMLAttributes), 0];
  },
});

export const Column = Node.create({
  name: "column",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: false,
  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: (dom: HTMLElement) => parseColumnWidth(dom.getAttribute("data-width")),
        renderHTML: (a: { width: number | null }) => (a.width ? { "data-width": formatColumnWidth(a.width), style: `flex-grow: ${formatColumnWidth(a.width)}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "column", class: "wy-column" }, HTMLAttributes), 0];
  },
});

const ICONS = [Columns2, Columns3, Columns4];

export const columnsExtension: EditorExtension = {
  name: "columns",
  tiptap: [Columns, Column],
  markdown: {
    fences: [{ kind: "columns", parse: (ctx) => ctx.sections("columns", "column", {}) }],
    tokens: {
      columns: { block: "columns" },
      column: { block: "column", getAttrs: (tok) => ({ width: parseColumnWidth(tok.meta?.label) }) },
    },
    nodes: {
      columns(state, node, _parent, _index, h) {
        const sections: Section[] = [];
        node.forEach((c) => sections.push({ label: c.attrs.width ? formatColumnWidth(c.attrs.width as number) : "", body: h.contentMarkdown(c) }));
        h.writeFence(state, node, "columns", joinSections(sections));
      },
      column() {},
    },
  },
  slash: ICONS.map(
    (icon, i): SlashItemDef => ({
      id: `columns${i + 2}`,
      group: "blocks",
      rank: 12 + i,
      label: "",
      icon,
      keywords: "columns layout side",
      run: (c) => c.insertSections("columns", "column", i + 2),
    }),
  ),
  convert: {
    sections: { columns: "column" },
    targets: [
      {
        id: "columns",
        label: "",
        icon: Columns2,
        rank: 38,
        convert: (blocks, ctx) => {
          const s = ctx.schema;
          if (blocks.length === 1 && blocks[0]!.type.name === "columns") return null;
          return [s.nodes.columns!.create(null, [s.nodes.column!.create(null, [...blocks]), s.nodes.column!.create(null, s.nodes.paragraph!.create())])];
        },
      },
    ],
  },
};
