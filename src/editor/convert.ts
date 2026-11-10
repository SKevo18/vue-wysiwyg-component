// lists, sections and item atoms share one intermediate form, the item: a first line and the blocks under it.
import type { Component } from "vue";
import { Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { NodeSelection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { FileCode2, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, List, ListOrdered, ListTodo, MessageSquareQuote, Pilcrow, Quote, Ungroup } from "@lucide/vue";
import { BULLET_STYLES, ORDERED_STYLES } from "../core/attrs";
import type { MarkdownConverter } from "../markdown";
import type { EditorConfig } from "../schema";
import type { ContainerSpec, ConvertContext, ConvertItem, ConvertTargetDef, MaybeText } from "../types";

type Blocks = readonly PMNode[];
type ListType = "bulletList" | "orderedList" | "taskList";
interface InternalContext extends ConvertContext {
  isContainer(n: PMNode): boolean;
  isSections(n: PMNode): boolean;
  flattenSections(node: PMNode): PMNode[];
  hasItems(n: PMNode): boolean;
}
type Transform = (blocks: Blocks, ctx: InternalContext) => PMNode[] | null;

const LISTS: Record<string, true> = { bulletList: true, orderedList: true, taskList: true };
const HEADING_ICONS = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6];

export interface ResolvedTarget {
  id: string;
  label: MaybeText;
  icon: Component | undefined;
  rank: number;
}

export interface ConvertRegistry {
  targets: ResolvedTarget[];
  transforms: Map<string, Transform[]>;
  convertible: Set<string>;
  wrappable: Set<string>;
  containers: Map<string, ContainerSpec>;
  sections: Map<string, string>;
  items: Map<string, (node: PMNode, ctx: ConvertContext) => ConvertItem[]>;
  paragraphs: Map<string, (node: PMNode, ctx: ConvertContext) => PMNode[] | null>;
  markdown: MarkdownConverter;
}

const typeOf = (n: PMNode) => n.type.name;
const isText = (n: PMNode) => typeOf(n) === "paragraph" || typeOf(n) === "heading";
const isList = (n: PMNode) => LISTS[typeOf(n)] === true;
const isEmptyParagraph = (n: PMNode) => typeOf(n) === "paragraph" && n.childCount === 0;

function childrenOf(node: PMNode): PMNode[] {
  const out: PMNode[] = [];
  node.forEach((c) => out.push(c));
  return out;
}

function paragraph(schema: Schema, content?: Fragment | null): PMNode {
  return schema.nodes.paragraph!.create(null, content);
}

function bold(content: Fragment, schema: Schema): Fragment {
  const mark = schema.marks.bold;
  if (!mark) return content;
  const out: PMNode[] = [];
  content.forEach((c) => out.push(c.mark(mark.create().addToSet(c.marks))));
  return Fragment.from(out);
}

function plainText(content: Fragment): string {
  let s = "";
  content.forEach((c) => {
    if (c.isText) s += c.text;
    else if (typeOf(c) === "hardBreak") s += "\n";
    else if (typeOf(c) === "mathInline") s += `$${c.attrs.tex}$`;
    else if (typeOf(c) === "image") s += c.attrs.alt ?? "";
    else s += c.textContent;
  });
  return s;
}

function sectionBody(section: PMNode): PMNode[] {
  const body = childrenOf(section);
  return body.length === 1 && isEmptyParagraph(body[0]!) ? [] : body;
}

function listItems(list: PMNode): ConvertItem[] {
  return childrenOf(list).map((item) => {
    const body = childrenOf(item);
    const first = body[0];
    const labelled = !!first && typeOf(first) === "paragraph";
    return { label: labelled ? first.content : Fragment.empty, body: labelled ? body.slice(1) : body, checked: item.attrs.checked === true };
  });
}

function listAttrs(source: PMNode | null, to: ListType): Record<string, unknown> | null {
  const style = (source?.attrs.listStyle as string | null | undefined) ?? null;
  if (to === "orderedList") return { start: 1, listStyle: style && (ORDERED_STYLES as readonly string[]).includes(style) ? style : null };
  if (to === "bulletList") return { listStyle: style && (BULLET_STYLES as readonly string[]).includes(style) ? style : null, marker: source && typeOf(source) === "bulletList" ? (source.attrs.marker ?? null) : null };
  return null;
}

function buildList(type: ListType, items: ConvertItem[], attrs: Record<string, unknown> | null, schema: Schema, nested: string | null): PMNode {
  const itemType = schema.nodes[type === "taskList" ? "taskItem" : "listItem"]!;
  const children = items.map((it) => {
    const body = it.body.map((b) => (nested && typeOf(b) === nested ? retypeList(b, type, schema) : b));
    return itemType.create(type === "taskList" ? { checked: it.checked } : null, [paragraph(schema, it.label), ...body]);
  });
  return schema.nodes[type]!.create(attrs, children);
}

function retypeList(list: PMNode, to: ListType, schema: Schema): PMNode {
  return buildList(to, listItems(list), listAttrs(list, to), schema, typeOf(list));
}

function sequenceItems(blocks: Blocks): ConvertItem[] | null {
  const out: ConvertItem[] = [];
  let prev: PMNode | null = null;
  for (const b of blocks) {
    if (isText(b)) out.push({ label: b.content, body: [], checked: false });
    else if (isList(b) && !(prev && isText(prev))) out.push(...listItems(b));
    else if (out.length) out[out.length - 1]!.body.push(b);
    else return null;
    prev = b;
  }
  return out;
}

function itemsToParagraphs(items: ConvertItem[], schema: Schema): PMNode[] {
  return items.flatMap((it) => [...(it.label.size || !it.body.length ? [paragraph(schema, it.label)] : []), ...it.body]);
}

export function convertRegistry(config: EditorConfig, markdown: MarkdownConverter): ConvertRegistry {
  const b = config.base;
  const reg: ConvertRegistry = {
    targets: [],
    transforms: new Map(),
    convertible: new Set(["paragraph", "heading", "codeBlock", "bulletList", "orderedList", "taskList", "blockquote", "callout"]),
    wrappable: new Set(["paragraph", "heading", "codeBlock", "bulletList", "orderedList", "taskList", "blockquote", "callout"]),
    containers: new Map(),
    sections: new Map(),
    items: new Map(),
    paragraphs: new Map(),
    markdown,
  };
  reg.containers.set("blockquote", {
    title: (node) => quoteTitle(node, markdown).title,
    build: ({ title, content }, ctx) => {
      const s = ctx.schema;
      return s.nodes.blockquote!.create(null, title ? [paragraph(s, bold(ctx.parseInline(title), s)), ...content] : content);
    },
  });
  reg.containers.set("callout", {
    title: (node) => String(node.attrs.title ?? "").trim(),
    build: ({ title, content }, ctx) => ctx.schema.nodes.callout!.create({ type: b.callouts[0] ?? "note", title }, content),
  });

  const defs: (Omit<ConvertTargetDef, "convert"> & { convert?: Transform })[] = [
    { id: "paragraph", label: "", icon: Pilcrow, rank: 0, convert: toParagraph },
    ...b.headings.map((level) => ({ id: `heading${level}`, label: "", icon: HEADING_ICONS[level - 1], rank: 9 + level, convert: toHeading(level) })),
    ...(b.lists ? [{ id: "bulletList", label: "", icon: List, rank: 20, convert: toList("bulletList") }, { id: "orderedList", label: "", icon: ListOrdered, rank: 21, convert: toList("orderedList") }] : []),
    ...(b.taskLists ? [{ id: "taskList", label: "", icon: ListTodo, rank: 22, convert: toList("taskList") }] : []),
    ...(b.blockquote ? [{ id: "quote", label: "", icon: Quote, rank: 30, container: "blockquote" }] : []),
    ...(b.callouts.length ? [{ id: "callout", label: "", icon: MessageSquareQuote, rank: 31, container: "callout" }] : []),
    ...(b.codeBlocks ? [{ id: "codeBlock", label: "", icon: FileCode2, rank: 60, convert: toCodeBlock }] : []),
    { id: "unwrap", label: "", icon: Ungroup, rank: 100, convert: toUnwrapped },
  ];
  for (const e of config.extensions) {
    const h = e.convert;
    if (!h) continue;
    for (const n of h.convertible ?? []) reg.convertible.add(n);
    for (const n of h.wrappable ?? []) reg.wrappable.add(n);
    for (const [n, spec] of Object.entries(h.containers ?? {})) {
      reg.containers.set(n, spec);
      reg.convertible.add(n);
      reg.wrappable.add(n);
    }
    for (const [n, child] of Object.entries(h.sections ?? {})) {
      reg.sections.set(n, child);
      reg.convertible.add(n);
      reg.wrappable.add(n);
    }
    for (const [n, fn] of Object.entries(h.items ?? {})) reg.items.set(n, fn);
    for (const [n, fn] of Object.entries(h.paragraphs ?? {})) reg.paragraphs.set(n, fn);
    defs.push(...(h.targets ?? []));
  }
  const byId = new Map<string, ResolvedTarget>();
  for (const d of defs) {
    const transform: Transform = d.convert ?? ((blocks, ctx) => ctx.wrap(blocks, d.container ?? "", d.id));
    reg.transforms.set(d.id, [transform, ...(reg.transforms.get(d.id) ?? [])]);
    const prev = byId.get(d.id);
    byId.set(d.id, { id: d.id, label: d.label || prev?.label || "", icon: d.icon ?? prev?.icon, rank: d.rank ?? prev?.rank ?? 50 });
  }
  reg.targets = [...byId.values()].sort((x, y) => x.rank - y.rank);
  return reg;
}

function quoteTitle(node: PMNode, markdown: MarkdownConverter): { title: string; content: PMNode[] } {
  const content = childrenOf(node);
  const schema = node.type.schema;
  const first = content[0];
  const boldMark = schema.marks.bold;
  if (boldMark && first && content.length > 1 && typeOf(first) === "paragraph" && first.childCount > 0) {
    let allBold = true;
    first.forEach((c) => (allBold &&= boldMark.isInSet(c.marks) !== undefined));
    if (allBold) {
      const plain: PMNode[] = [];
      first.forEach((c) => plain.push(c.mark(boldMark.removeFromSet(c.marks))));
      const title = markdown.serializeInline(schema.topNodeType.create(null, paragraph(schema, Fragment.from(plain))));
      return { title, content: content.slice(1) };
    }
  }
  return { title: "", content };
}

function context(reg: ConvertRegistry, schema: Schema): InternalContext {
  const md = reg.markdown;
  const isContainer = (n: PMNode) => reg.containers.has(typeOf(n));
  const isSections = (n: PMNode) => reg.sections.has(typeOf(n));

  const titled = (node: PMNode): { title: string; content: PMNode[] } => {
    if (typeOf(node) === "blockquote") return quoteTitle(node, md);
    return { title: reg.containers.get(typeOf(node))!.title(node), content: childrenOf(node) };
  };

  const sectionItems = (node: PMNode): ConvertItem[] => childrenOf(node).map((s) => ({ label: ctx.parseInline(String(s.attrs.label ?? "")), body: sectionBody(s), checked: false }));

  const buildSections = (type: string, sections: { label: string; body: PMNode[] }[], attrs: Record<string, unknown> | null = null): PMNode => {
    const child = schema.nodes[reg.sections.get(type)!]!;
    return schema.nodes[type]!.create(attrs, sections.map((s) => child.create({ label: s.label }, s.body.length ? s.body : [paragraph(schema)])));
  };

  const flattenSections = (node: PMNode): PMNode[] => {
    const out: PMNode[] = [];
    node.forEach((s) => {
      const label = String(s.attrs.label ?? "").trim();
      if (label) out.push(paragraph(schema, bold(ctx.parseInline(label), schema)));
      out.push(...sectionBody(s));
    });
    return out.length ? out : [paragraph(schema)];
  };

  const build = (node: string, target: string, input: { title: string; content: PMNode[] }): PMNode => {
    if (reg.sections.has(node)) return buildSections(node, [{ label: input.title, body: input.content }]);
    return reg.containers.get(node)!.build(input, ctx, target);
  };

  const toParagraphs = (b: PMNode): PMNode[] | null => {
    if (isText(b)) return [paragraph(schema, b.content)];
    const own = reg.paragraphs.get(typeOf(b));
    if (own) return own(b, ctx);
    if (typeOf(b) === "codeBlock") {
      const lines = b.textContent.split("\n").filter((l) => l.trim());
      return lines.length ? lines.map((l) => paragraph(schema, Fragment.from(schema.text(l)))) : [paragraph(schema)];
    }
    if (isList(b)) return itemsToParagraphs(listItems(b), schema);
    if (isContainer(b)) {
      const content = childrenOf(b);
      return content.every(isText) ? content.map((c) => paragraph(schema, c.content)) : null;
    }
    return null;
  };

  const ctx: InternalContext = {
    isContainer,
    isSections,
    flattenSections,
    hasItems: (n) => reg.items.has(typeOf(n)),
    schema,
    items(blocks) {
      const b = blocks.length === 1 ? blocks[0]! : null;
      if (b && isList(b)) return listItems(b);
      if (b && isSections(b)) return sectionItems(b);
      const own = b && reg.items.get(typeOf(b));
      if (b && own) return own(b, ctx);
      if (b && isContainer(b)) return sequenceItems(childrenOf(b));
      return sequenceItems(blocks);
    },
    list: (type, items) => buildList(type, items, listAttrs(null, type), schema, null),
    paragraphs(blocks) {
      const out: PMNode[] = [];
      for (const b of blocks) {
        const ps = toParagraphs(b);
        if (!ps) return null;
        out.push(...ps);
      }
      return out;
    },
    itemParagraphs: (items) => itemsToParagraphs(items, schema),
    wrap(blocks, node, target) {
      if (!schema.nodes[node]) return null;
      const b = blocks.length === 1 ? blocks[0]! : null;
      if (b && typeOf(b) === node) return null;
      if (b && isContainer(b)) return [build(node, target, titled(b))];
      if (b && isSections(b)) {
        if (reg.sections.has(node)) {
          const child = schema.nodes[reg.sections.get(node)!]!;
          return [schema.nodes[node]!.create(null, childrenOf(b).map((s) => child.create({ label: s.attrs.label }, s.content)))];
        }
        const sections = childrenOf(b);
        if (sections.length === 1) {
          const s = sections[0]!;
          const body = sectionBody(s);
          return [build(node, target, { title: String(s.attrs.label ?? "").trim(), content: body.length ? body : [paragraph(schema)] })];
        }
        return [build(node, target, { title: typeof b.attrs.title === "string" ? b.attrs.title.trim() : "", content: flattenSections(b) })];
      }
      if (b && isList(b) && reg.sections.has(node)) {
        return [buildSections(node, listItems(b).map((it) => ({ label: ctx.inlineMarkdown(it.label), body: it.body })))];
      }
      if (!blocks.every((x) => reg.wrappable.has(typeOf(x)))) return null;
      return [build(node, target, { title: "", content: [...blocks] })];
    },
    parse: (src) => childrenOf(md.parse(src, schema)).filter((x) => !isEmptyParagraph(x)),
    parseInline: (src) => (src.trim() ? (md.parseInline(src, schema).firstChild?.content ?? Fragment.empty) : Fragment.empty),
    serialize: (blocks) => md.serialize(schema.topNodeType.create(null, [...blocks])),
    inlineMarkdown: (content) => (content.size ? md.serializeInline(schema.topNodeType.create(null, paragraph(schema, content))) : ""),
    plainText,
  };
  return ctx;
}

const toParagraph: Transform = (blocks, ctx) => ctx.paragraphs(blocks);

function toHeading(level: number): Transform {
  return (blocks, ctx) => {
    if (blocks.some((b) => typeOf(b) === "codeBlock")) return null;
    const ps = ctx.paragraphs(blocks);
    if (!ps?.every((p) => typeOf(p) === "paragraph")) return null;
    if (blocks.some((b) => ctx.hasItems(b))) return null;
    return ps.map((p) => ctx.schema.nodes.heading!.create({ level }, p.content));
  };
}

function toList(type: ListType): Transform {
  return (blocks, ctx) => {
    const b = blocks.length === 1 ? blocks[0]! : null;
    if (b && isList(b)) return typeOf(b) === type ? null : [retypeList(b, type, ctx.schema)];
    const items = ctx.items(blocks);
    return items?.length ? [ctx.list(type, items)] : null;
  };
}

const toCodeBlock: Transform = (blocks, ctx) => {
  if (!blocks.every(isText)) return null;
  const text = blocks.map((x) => plainText(x.content)).join("\n");
  return [ctx.schema.nodes.codeBlock!.create({ language: null }, text ? ctx.schema.text(text) : null)];
};

const toUnwrapped: Transform = (blocks, ctx) => {
  const b = blocks.length === 1 ? blocks[0]! : null;
  if (b && ctx.isContainer(b)) return childrenOf(b);
  if (b && ctx.isSections(b)) return ctx.flattenSections(b);
  return null;
};

export function convertBlocks(reg: ConvertRegistry, blocks: Blocks, target: string, schema: Schema): PMNode[] | null {
  if (!blocks.length || !blocks.every((b) => reg.convertible.has(typeOf(b)))) return null;
  const ctx = context(reg, schema);
  for (const transform of reg.transforms.get(target) ?? []) {
    try {
      const out = transform(blocks, ctx);
      if (!out?.length) continue;
      for (const n of out) n.check();
      return out;
    } catch (e) {
      // an extension's transform that throws or builds an invalid node falls back to the earlier one
      console.error(`vue-wysiwyg-component: convert target "${target}" failed`, e);
    }
  }
  return null;
}

function sameNodes(a: Blocks, b: Blocks): boolean {
  return a.length === b.length && a.every((n, i) => n.eq(b[i]!));
}

export function convertTargets(reg: ConvertRegistry, blocks: Blocks, schema: Schema, fits: (nodes: PMNode[]) => boolean = () => true): ResolvedTarget[] {
  const results = new Map<string, PMNode[]>();
  for (const t of reg.targets) {
    const out = convertBlocks(reg, blocks, t.id, schema);
    if (out && !sameNodes(out, blocks) && fits(out)) results.set(t.id, out);
  }
  const unwrapped = results.get("unwrap");
  const paragraphs = results.get("paragraph");
  if (unwrapped && paragraphs && sameNodes(unwrapped, paragraphs)) results.delete("unwrap");
  return reg.targets.filter((t) => results.has(t.id));
}

export interface BlockRun {
  from: number;
  to: number;
  nodes: PMNode[];
}

export function selectionRun(state: EditorState): BlockRun | null {
  const range = state.selection.$from.blockRange(state.selection.$to, (n) => n.type.spec.content === "block+");
  if (!range) return null;
  const nodes: PMNode[] = [];
  for (let i = range.startIndex; i < range.endIndex; i++) nodes.push(range.parent.child(i));
  return nodes.length ? { from: range.start, to: range.end, nodes } : null;
}

export function nodeRun(state: EditorState, pos: number): BlockRun | null {
  const node = pos >= 0 && pos < state.doc.content.size ? state.doc.nodeAt(pos) : null;
  return node?.isBlock ? { from: pos, to: pos + node.nodeSize, nodes: [node] } : null;
}

export function runTargets(reg: ConvertRegistry, state: EditorState, run: BlockRun): ResolvedTarget[] {
  const $from = state.doc.resolve(run.from);
  const start = $from.index();
  const end = start + run.nodes.length;
  return convertTargets(reg, run.nodes, state.schema, (nodes) => $from.parent.canReplace(start, end, Fragment.from(nodes)));
}

export function convertRun(reg: ConvertRegistry, state: EditorState, run: BlockRun, target: string, selectAll = false): Transaction | null {
  const nodes = convertBlocks(reg, run.nodes, target, state.schema);
  if (!nodes) return null;
  const tr = state.tr.replaceWith(run.from, run.to, nodes);
  const end = run.from + Fragment.from(nodes).size;
  let firstStart = -1;
  let firstEnd = -1;
  let lastEnd = -1;
  tr.doc.nodesBetween(run.from, end, (n, pos) => {
    if (!n.isTextblock) return true;
    if (firstStart < 0) {
      firstStart = pos + 1;
      firstEnd = pos + n.nodeSize - 1;
    }
    lastEnd = pos + n.nodeSize - 1;
    return false;
  });
  if (firstStart < 0) tr.setSelection(NodeSelection.create(tr.doc, run.from));
  else tr.setSelection(selectAll ? TextSelection.create(tr.doc, firstStart, lastEnd) : TextSelection.create(tr.doc, firstEnd));
  return tr.scrollIntoView();
}
