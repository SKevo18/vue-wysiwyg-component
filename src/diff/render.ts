// Turns a block diff (docdiff.ts) into one document an editor can show read-only: the newer document with the removed
// blocks and words kept in place, plus decorations that color what was added and removed.
import { Extension } from "@tiptap/core";
import { Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DiffBlock, DocMark, DocNode } from "./docdiff";

export interface DiffLabels {
  /** tag of a block that moved here */
  movedHere: string;
  /** tag of a block's old place */
  movedAway: string;
  /** tooltip of a block whose style or settings changed */
  changed: string;
}

/** Drops the node types and marks the schema lacks (a document saved by an editor with other extensions). */
export function fitSchema(node: DocNode, schema: Schema): DocNode | null {
  if (node.type === "text") {
    if (!node.text) return null;
  } else if (!schema.nodes[node.type]) return null;
  const marks = node.marks?.filter((m: DocMark) => !!schema.marks[m.type]);
  const content = node.content?.flatMap((c) => fitSchema(c, schema) ?? []);
  return { ...node, ...(node.marks ? { marks: marks?.length ? marks : undefined } : {}), ...(node.content ? { content } : {}) };
}

/** A node as the diff shows it: modified containers and text blocks hold the old and the new content together. */
function shown(b: DiffBlock): DocNode {
  let node = b.node;
  // a changed toggle opens, so its changes show
  if (b.change !== "same" && node.attrs?.open === false) node = { ...node, attrs: { ...node.attrs, open: true } };
  if (b.inline) return { ...node, content: b.inline.map((s) => (s.kind === "atom" ? s.node : { type: "text", text: s.text, ...(s.marks.length ? { marks: s.marks } : {}) })) };
  if (b.children) return { ...node, content: b.children.map(shown) };
  return node;
}

/**
 * Makes a diff fit the schema: a modified container whose old and new children together break its content rule (two
 * captions, a second title) shows as the old container removed and the new one added.
 */
function fit(blocks: DiffBlock[], schema: Schema): DiffBlock[] {
  return blocks.flatMap((b): DiffBlock[] => {
    if (b.change !== "modified" || !b.children || !b.before) return [b];
    const children = fit(b.children, schema);
    const type = schema.nodes[b.node.type];
    const content = Fragment.fromJSON(schema, children.map(shown));
    if (!type || type.validContent(content)) return [{ ...b, children }];
    return [
      { node: b.before, change: "removed" },
      { node: b.node, change: "added" },
    ];
  });
}

/** The document a diff shows and the decorations that mark its changes. */
export function diffDocument(schema: Schema, diff: DiffBlock[], labels: DiffLabels): { doc: PMNode; decorations: Decoration[] } {
  const blocks = fit(diff, schema);
  const doc = schema.nodeFromJSON({ type: "doc", content: blocks.map(shown) });
  const out: Decoration[] = [];
  decorate(schema, blocks, doc, 0, labels, out);
  return { doc, decorations: out };
}

function decorate(schema: Schema, blocks: DiffBlock[], parent: PMNode, start: number, labels: DiffLabels, out: Decoration[]) {
  parent.forEach((child, offset, i) => {
    const b = blocks[i];
    if (!b) return;
    const from = start + offset;
    const to = from + child.nodeSize;
    if (b.change === "added" || b.change === "removed") {
      const moved = b.moved ? { "data-diff-label": b.change === "added" ? labels.movedHere : labels.movedAway } : {};
      out.push(Decoration.node(from, to, { class: `wy-diff-block wy-diff-${b.change}${b.moved ? " wy-diff-moved" : ""}`, ...moved }));
      return;
    }
    if (b.change !== "modified") return;
    if (b.attrsChanged) out.push(Decoration.node(from, to, { class: "wy-diff-changed", title: labels.changed }));
    if (b.inline) {
      let at = from + 1;
      for (const s of b.inline) {
        const size = s.kind === "text" ? s.text.length : schema.nodeFromJSON(s.node).nodeSize;
        if (s.change !== "same") out.push(Decoration.inline(at, at + size, { class: s.change === "added" ? "wy-diff-ins" : "wy-diff-del" }));
        at += size;
      }
    } else if (b.children) decorate(schema, b.children, child, from + 1, labels, out);
  });
}

export const diffKey = new PluginKey<DecorationSet>("wyDiff");

/** Holds the diff decorations of a DocDiffView's editor; a transaction with `diffKey` meta replaces them. */
export const DiffDecorations = Extension.create({
  name: "docDiff",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: diffKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => (tr.getMeta(diffKey) as DecorationSet | undefined) ?? set.map(tr.mapping, tr.doc),
        },
        props: { decorations: (state) => diffKey.getState(state) },
      }),
    ];
  },
});
