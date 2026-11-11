// Notion-like diff of two documents (ProseMirror JSON): blocks are matched first (longest common subsequence of whole
// blocks), unmatched blocks of the same kind that still look alike are paired as modified, text blocks then get a
// word-level diff and containers (lists, quotes, tables, toggles) a recursive block diff. A block deleted in one place
// and inserted unchanged in another is marked as moved. Atoms (images, embeds, bookmarks) and atomic blocks (diagram
// sources) that changed show as the old one removed and the new one added.
import type { Schema } from "@tiptap/pm/model";

/** A ProseMirror mark as JSON. */
export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** A ProseMirror node as JSON (`node.toJSON()`, `editor.getJSON()`). */
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
}

export type DiffChange = "same" | "added" | "removed";

/** A run of text, or an inline atom such as a hard break or a mention, in a text block. */
export type DiffInline = { kind: "text"; text: string; marks: DocMark[]; change: DiffChange } | { kind: "atom"; node: DocNode; change: DiffChange };

export interface DiffBlock {
  /** the node to show: the newer one, or the older one when removed */
  node: DocNode;
  change: DiffChange | "modified";
  /** modified blocks: the older node */
  before?: DocNode;
  /** removed here and added unchanged elsewhere, or the reverse */
  moved?: boolean;
  /** a modified block whose own attributes changed (heading level, checked task, cell color) */
  attrsChanged?: boolean;
  /** text blocks: their inline content, word-diffed when modified */
  inline?: DiffInline[];
  /** containers: their child blocks, diffed when modified */
  children?: DiffBlock[];
}

export interface DiffOptions {
  /** decides which node types are inline and which are text blocks; without it the base schema's names are assumed */
  schema?: Schema;
  /** blocks compared as a whole: any change to their content shows the old block removed and the new one added.
   *  Default: mermaid and plantuml code blocks */
  atomic?(node: DocNode): boolean;
}

/** Inline node types (besides text) of the base schema, used without a schema. */
const INLINE: Record<string, true> = { hardBreak: true, mention: true, mathInline: true, footnoteRef: true, emoji: true, image: true, inlineImage: true, pageLink: true };
/** Types that are text blocks even when empty, used without a schema. */
const TEXT_TYPES: Record<string, true> = { paragraph: true, heading: true, codeBlock: true, detailsSummary: true };
/** Containers whose children are matched by position when both sides have as many: a row's cells, columns. */
const POSITIONAL: Record<string, true> = { tableRow: true, columns: true };
const DIAGRAMS: Record<string, true> = { mermaid: true, plantuml: true };

/** A code block in a diagram language: it shows as its picture, so a changed source is a changed picture. */
export function isDiagram(n: DocNode): boolean {
  const lang = n.attrs?.language;
  return n.type === "codeBlock" && typeof lang === "string" && DIAGRAMS[lang] === true;
}

/** A JSON string with sorted keys: equal nodes give equal keys. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function words(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
}

/** Dice coefficient of two texts' word multisets, 0…1. */
export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.length && !wb.length) return 1;
  if (!wa.length || !wb.length) return 0;
  const count = new Map<string, number>();
  for (const w of wa) count.set(w, (count.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of wb) {
    const n = count.get(w) ?? 0;
    if (n > 0) {
      common++;
      count.set(w, n - 1);
    }
  }
  return (2 * common) / (wa.length + wb.length);
}

/** Below this similarity two blocks are shown as one removed and one added. */
const PAIR_THRESHOLD = 0.4;

type Op = { kind: "keep"; a: number; b: number } | { kind: "pair"; a: number; b: number } | { kind: "del"; a: number } | { kind: "ins"; b: number };

/** Bounds the cells of one LCS table; larger middles are replaced whole. */
const MAX_CELLS = 4_000_000;
/** Bounds the cells of the similarity-weighted alignment; longer block lists are matched exactly (lcs). */
const MAX_ALIGN = 250_000;

/** A minimal edit script from a to b by longest common subsequence of keys, after trimming the common ends. */
function lcs(a: readonly string[], b: readonly string[]): Op[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const ops: Op[] = [];
  for (let i = 0; i < start; i++) ops.push({ kind: "keep", a: i, b: i });
  const n = endA - start;
  const m = endB - start;
  if (n * m > MAX_CELLS) {
    for (let i = start; i < endA; i++) ops.push({ kind: "del", a: i });
    for (let j = start; j < endB; j++) ops.push({ kind: "ins", b: j });
  } else {
    // t[i][j]: LCS length of a[start+i…endA) and b[start+j…endB)
    const w = m + 1;
    const t = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        t[i * w + j] = a[start + i] === b[start + j] ? t[(i + 1) * w + j + 1]! + 1 : Math.max(t[(i + 1) * w + j]!, t[i * w + j + 1]!);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        ops.push({ kind: "keep", a: start + i++, b: start + j++ });
      } else if (i < n && (j === m || t[(i + 1) * w + j]! >= t[i * w + j + 1]!)) {
        ops.push({ kind: "del", a: start + i++ });
      } else {
        ops.push({ kind: "ins", b: start + j++ });
      }
    }
  }
  for (let k = 0; k < a.length - endA; k++) ops.push({ kind: "keep", a: endA + k, b: endB + k });
  return ops;
}

/** Diffs two documents (or containers). `before` null shows every block of `after` as added. */
export function diffDocs(before: DocNode | null, after: DocNode, options: DiffOptions = {}): DiffBlock[] {
  const d = new Differ(options);
  if (!before) return (after.content ?? []).map((n) => d.plain(n, "added"));
  return d.blocks(before.content ?? [], after.content ?? []);
}

/** Whether a diff shows any change. */
export function diffHasChanges(blocks: readonly DiffBlock[]): boolean {
  return blocks.some((b) => b.change !== "same");
}

interface Token {
  key: string;
  inline: DiffInline;
}

class Differ {
  private readonly texts = new WeakMap<DocNode, string>();
  private readonly isAtomic: (n: DocNode) => boolean;
  private readonly isInline: (type: string) => boolean;
  private readonly isTextType: (type: string) => boolean;

  constructor(opts: DiffOptions) {
    this.isAtomic = opts.atomic ?? isDiagram;
    const schema = opts.schema;
    this.isInline = schema ? (t) => t === "text" || (schema.nodes[t]?.isInline ?? INLINE[t] === true) : (t) => t === "text" || INLINE[t] === true;
    this.isTextType = schema ? (t) => schema.nodes[t]?.isTextblock ?? TEXT_TYPES[t] === true : (t) => TEXT_TYPES[t] === true;
  }

  textblock(n: DocNode): boolean {
    if (n.type === "text" || this.isInline(n.type)) return false;
    const c = n.content ?? [];
    if (!c.length) return this.isTextType(n.type);
    return c.every((k) => this.isInline(k.type));
  }

  private textOf(n: DocNode): string {
    if (n.text !== undefined) return n.text;
    let s = this.texts.get(n);
    if (s === undefined) {
      s = (n.content ?? []).map((k) => this.textOf(k)).join(n.content?.every((k) => k.type === "text") ? "" : " ");
      this.texts.set(n, s);
    }
    return s;
  }

  plain(n: DocNode, change: DiffChange): DiffBlock {
    if (this.textblock(n)) return { node: n, change, inline: merge(tokens(n.content ?? [], change).map((t) => t.inline)) };
    if (n.content?.length) return { node: n, change, children: n.content.map((c) => this.plain(c, change)) };
    return { node: n, change };
  }

  blocks(a: DocNode[], b: DocNode[]): DiffBlock[] {
    const ka = a.map(canonical);
    const kb = b.map(canonical);
    const ops = this.align(a, b, ka, kb);

    // Blocks removed and added unchanged elsewhere are moves, not edits.
    const added = new Map<string, number>();
    for (const op of ops) if (op.kind === "ins") added.set(kb[op.b]!, (added.get(kb[op.b]!) ?? 0) + 1);
    const movedKeys = new Map<string, number>();
    for (const op of ops) {
      if (op.kind !== "del") continue;
      const n = added.get(ka[op.a]!) ?? 0;
      if (n > 0) {
        added.set(ka[op.a]!, n - 1);
        movedKeys.set(ka[op.a]!, (movedKeys.get(ka[op.a]!) ?? 0) + 1);
      }
    }
    const movedDel = new Map(movedKeys);
    const movedIns = new Map(movedKeys);
    const take = (m: Map<string, number>, k: string) => {
      const n = m.get(k) ?? 0;
      if (n > 0) m.set(k, n - 1);
      return n > 0;
    };

    const out: DiffBlock[] = [];
    for (let i = 0; i < ops.length; ) {
      const op = ops[i]!;
      if (op.kind === "keep" || op.kind === "pair") {
        out.push(op.kind === "keep" ? this.plain(b[op.b]!, "same") : this.modified(a[op.a]!, b[op.b]!));
        i++;
        continue;
      }
      // a hunk: the run of deletes and inserts up to the next kept block
      const dels: number[] = [];
      const ins: number[] = [];
      for (; i < ops.length && (ops[i]!.kind === "del" || ops[i]!.kind === "ins"); i++) {
        const o = ops[i]!;
        if (o.kind === "del") dels.push(o.a);
        else if (o.kind === "ins") ins.push(o.b);
      }
      const delMoved = dels.map((d) => take(movedDel, ka[d]!));
      const insMoved = ins.map((x) => take(movedIns, kb[x]!));
      out.push(...this.hunk(a, b, dels, ins, delMoved, insMoved));
    }
    return out;
  }

  /**
   * Aligns two block lists, maximizing a score: equal blocks count 2, alike blocks 1 plus their likeness. Two edited
   * blocks in place so outweigh one unchanged block that moved past them, which then shows as moved.
   */
  private align(a: DocNode[], b: DocNode[], ka: string[], kb: string[]): Op[] {
    let start = 0;
    while (start < a.length && start < b.length && ka[start] === kb[start]) start++;
    let endA = a.length;
    let endB = b.length;
    while (endA > start && endB > start && ka[endA - 1] === kb[endB - 1]) {
      endA--;
      endB--;
    }
    const n = endA - start;
    const m = endB - start;
    if (n * m > MAX_ALIGN) return lcs(ka, kb);
    const score = new Float64Array(n * m);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const x = start + i;
        const y = start + j;
        if (ka[x] === kb[y]) {
          score[i * m + j] = 2;
          continue;
        }
        const like = this.likeness(a[x]!, b[y]!);
        if (like > 0) score[i * m + j] = 1 + like;
      }
    }
    const w = m + 1;
    const t = new Float64Array((n + 1) * w); // t[i][j]: best score of a[start+i…endA) against b[start+j…endB)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        const s = score[i * m + j]!;
        t[i * w + j] = Math.max(t[(i + 1) * w + j]!, t[i * w + j + 1]!, s > 0 ? s + t[(i + 1) * w + j + 1]! : 0);
      }
    }
    const ops: Op[] = [];
    for (let k = 0; k < start; k++) ops.push({ kind: "keep", a: k, b: k });
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      const s = i < n && j < m ? score[i * m + j]! : 0;
      if (s > 0 && t[i * w + j] === s + t[(i + 1) * w + j + 1]!) {
        ops.push({ kind: ka[start + i] === kb[start + j] ? "keep" : "pair", a: start + i++, b: start + j++ });
      } else if (i < n && (j === m || t[(i + 1) * w + j]! >= t[i * w + j + 1]!)) {
        ops.push({ kind: "del", a: start + i++ });
      } else {
        ops.push({ kind: "ins", b: start + j++ });
      }
    }
    for (let k = 0; k < a.length - endA; k++) ops.push({ kind: "keep", a: endA + k, b: endB + k });
    return ops;
  }

  /**
   * Orders a hunk's blocks: pairs of alike blocks become modified ones, in place; a replaced atom (an image swapped,
   * a diagram redrawn) shows as the old one removed right before the new one; the rest removed before added.
   */
  private hunk(a: DocNode[], b: DocNode[], dels: number[], ins: number[], delMoved: boolean[], insMoved: boolean[]): DiffBlock[] {
    const pairs: [number, number, "modified" | "swap"][] = []; // indexes into dels and ins
    let from = 0;
    for (let j = 0; j < ins.length; j++) {
      if (insMoved[j]) continue;
      const nb = b[ins[j]!]!;
      for (let i = from; i < dels.length; i++) {
        if (delMoved[i]) continue;
        const na = a[dels[i]!]!;
        const kind = this.likeness(na, nb) > 0 ? "modified" : na.type === nb.type && (this.isAtomic(na) || (!this.textblock(na) && !na.content?.length)) ? "swap" : null;
        if (kind) {
          pairs.push([i, j, kind]);
          from = i + 1;
          break;
        }
      }
    }
    const out: DiffBlock[] = [];
    const removed = (i: number): DiffBlock => ({ ...this.plain(a[dels[i]!]!, "removed"), ...(delMoved[i] ? { moved: true } : {}) });
    const addedB = (j: number): DiffBlock => ({ ...this.plain(b[ins[j]!]!, "added"), ...(insMoved[j] ? { moved: true } : {}) });
    let i = 0;
    let j = 0;
    for (const [pi, pj, kind] of pairs) {
      for (; i < pi; i++) out.push(removed(i));
      for (; j < pj; j++) out.push(addedB(j));
      if (kind === "modified") out.push(this.modified(a[dels[pi]!]!, b[ins[pj]!]!));
      else out.push(removed(pi), addedB(pj));
      i = pi + 1;
      j = pj + 1;
    }
    for (; i < dels.length; i++) out.push(removed(i));
    for (; j < ins.length; j++) out.push(addedB(j));
    return out;
  }

  /** How alike two blocks of the same kind are, PAIR_THRESHOLD…1, or 0 when they should show as removed and added. */
  private likeness(x: DocNode, y: DocNode): number {
    if (x.type !== y.type) return 0;
    const tx = this.textblock(x);
    if (tx !== this.textblock(y)) return 0;
    if (!tx && !x.content?.length && !y.content?.length) return 0; // atoms: removed and added
    const sameContent = canonical(x.content ?? []) === canonical(y.content ?? []);
    if (sameContent) return 1; // only attributes changed
    if (this.isAtomic(x) || this.isAtomic(y)) return 0;
    const s = similarity(this.textOf(x), this.textOf(y));
    return s >= PAIR_THRESHOLD ? s : 0;
  }

  /** Whether two blocks can show as one modified block, whatever their likeness. */
  private pairable(x: DocNode, y: DocNode): boolean {
    if (canonical(x) === canonical(y)) return true;
    if (x.type !== y.type || this.textblock(x) !== this.textblock(y)) return false;
    if (!x.content?.length && !y.content?.length && !this.textblock(x)) return false; // atoms
    return canonical(x.content ?? []) === canonical(y.content ?? []) || !(this.isAtomic(x) || this.isAtomic(y));
  }

  private modified(x: DocNode, y: DocNode): DiffBlock {
    const attrsChanged = canonical(x.attrs ?? {}) !== canonical(y.attrs ?? {});
    if (this.textblock(y)) return { node: y, before: x, change: "modified", attrsChanged, inline: diffInline(x.content ?? [], y.content ?? []) };
    const a = x.content ?? [];
    const b = y.content ?? [];
    // a row's cells and a column set keep their places; a lone child (a cell's or list item's paragraph) is reworded
    const positional = (POSITIONAL[y.type] === true || a.length === 1) && a.length === b.length && a.every((n, i) => this.pairable(n, b[i]!));
    const children = positional ? a.map((n, i) => (canonical(n) === canonical(b[i]!) ? this.plain(b[i]!, "same") : this.modified(n, b[i]!))) : this.blocks(a, b);
    return { node: y, before: x, change: "modified", attrsChanged, children };
  }
}

// --- inline ----------------------------------------------------------------------------------------------------

function tokens(content: DocNode[], change: DiffChange): Token[] {
  const out: Token[] = [];
  for (const n of content) {
    if (n.type !== "text") {
      out.push({ key: `\u0001${canonical(n)}`, inline: { kind: "atom", node: n, change } });
      continue;
    }
    const marks = [...(n.marks ?? [])].sort((p, q) => p.type.localeCompare(q.type));
    const mk = canonical(marks);
    for (const piece of (n.text ?? "").match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? []) {
      out.push({ key: `${piece}\u0000${mk}`, inline: { kind: "text", text: piece, marks, change } });
    }
  }
  return out;
}

/** Word-level diff of two text blocks' inline content. A formatting change shows as the old words removed and the
 *  newly formatted ones added. */
export function diffInline(a: DocNode[], b: DocNode[]): DiffInline[] {
  const ta = tokens(a, "removed");
  const tb = tokens(b, "added");
  const out: DiffInline[] = [];
  for (const op of lcs(
    ta.map((t) => t.key),
    tb.map((t) => t.key),
  )) {
    if (op.kind === "keep") out.push({ ...tb[op.b]!.inline, change: "same" });
    else if (op.kind === "del") out.push(ta[op.a]!.inline);
    else if (op.kind === "ins") out.push(tb[op.b]!.inline);
  }
  return merge(reorder(out));
}

/** Within each changed stretch, puts removed runs before added ones, so a replaced phrase reads "old new". Spaces
 *  kept between two changes join the stretch on both sides: "[-one hour][+thirty minutes]", not word by word. */
function reorder(list: DiffInline[]): DiffInline[] {
  const out: DiffInline[] = [];
  const gap = (s: DiffInline) => s.kind === "text" && s.change === "same" && /^\s+$/.test(s.text);
  for (let i = 0; i < list.length; ) {
    if (list[i]!.change === "same") {
      out.push(list[i++]!);
      continue;
    }
    const removed: DiffInline[] = [];
    const added: DiffInline[] = [];
    for (; i < list.length; i++) {
      const s = list[i]!;
      if (s.change !== "same") (s.change === "removed" ? removed : added).push(s);
      else if (gap(s) && list[i + 1] && list[i + 1]!.change !== "same") {
        removed.push({ ...s, change: "removed" });
        added.push({ ...s, change: "added" });
      } else break;
    }
    out.push(...removed, ...added);
  }
  return out;
}

/** Joins adjacent text runs with the same change and marks. */
function merge(list: DiffInline[]): DiffInline[] {
  const out: DiffInline[] = [];
  for (const s of list) {
    const last = out.at(-1);
    if (last && last.kind === "text" && s.kind === "text" && last.change === s.change && canonical(last.marks) === canonical(s.marks)) {
      out[out.length - 1] = { ...last, text: last.text + s.text };
    } else out.push(s);
  }
  return out;
}
