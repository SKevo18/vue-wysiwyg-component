// serialising a parsed document must reproduce the documented syntax byte for byte
import markdownit from "markdown-it";
import type { MarkdownIt, Token } from "markdown-it";
import mark from "markdown-it-mark";
import { MarkdownParser, MarkdownSerializer, MarkdownSerializerState, type ParseSpec } from "prosemirror-markdown";
import { DOMSerializer, Slice, type Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { DEFAULT_DIVIDER, blockAttrsPlugin, blockColorPlugin, formatBlockAttrs, formatDividerAttrs, formatListAttrs, type DividerAttrs, type ListAttrs } from "../core/attrs";
import { fenceFor, formatInfo, joinSections, type Section } from "../core/info";
import { formatImageAttrs, type ImageAttrs } from "../core/media";
import { NO_EXTENSIONS, resolveConfig, schemaFor, type EditorConfig } from "../schema";
import type { BaseOptions, EditorExtension, MarkSerializer, NodeSerializer, SerializeHelpers } from "../types";
import { atomToken, figureRule, imageAttrsRule, retagTokens, tableCellsRule, type FigureMeta, type RetagOptions } from "./rules";

type NodeFn = (state: MarkdownSerializerState, node: PMNode, parent: PMNode, index: number) => void;
type MarkSpec = ConstructorParameters<typeof MarkdownSerializer>[1][string];

export interface MarkdownConverter {
  readonly config: EditorConfig;
  readonly schema: Schema;
  readonly inlineSchema: Schema;
  parse(md: string, schema?: Schema): PMNode;
  parseInline(md: string, schema?: Schema): PMNode;
  serialize(doc: PMNode): string;
  serializeInline(doc: PMNode): string;
  serializeNode(node: PMNode): string;
  slice(md: string, schema?: Schema): Slice;
  toHtml(md: string): string;
}

function cellAttrs(tok: Token): { align: string | null } {
  const m = /text-align:\s*(left|center|right)/.exec(String(tok.attrGet("style") ?? ""));
  return { align: m ? m[1]! : null };
}

function imageAttrs(meta: Partial<ImageAttrs> | null | undefined): ImageAttrs {
  return { width: meta?.width ?? null, align: meta?.align ?? null };
}

function baseTokens(config: EditorConfig): Record<string, ParseSpec> {
  const levels = config.base.headings;
  const top = levels.length ? Math.max(...levels) : 6;
  return {
    blockquote: { block: "blockquote" },
    paragraph: { block: "paragraph" },
    list_item: { block: "listItem" },
    bullet_list: { block: "bulletList", getAttrs: (tok) => ({ listStyle: tok.meta?.list?.style ?? null, marker: tok.meta?.list?.marker ?? null }) },
    ordered_list: { block: "orderedList", getAttrs: (tok) => ({ start: +(tok.attrGet("start") ?? 1) || 1, listStyle: tok.meta?.list?.style ?? null }) },
    task_list: { block: "taskList" },
    task_item: { block: "taskItem", getAttrs: (tok) => ({ checked: !!tok.meta?.checked }) },
    heading: { block: "heading", getAttrs: (tok) => ({ level: Math.min(+tok.tag.slice(1), top) }) },
    code_block: { block: "codeBlock", noCloseToken: true, getAttrs: () => ({ language: null, meta: "" }) },
    fence: {
      block: "codeBlock",
      noCloseToken: true,
      getAttrs: (tok) => {
        const info = tok.info.trim();
        const sp = info.search(/\s/);
        return { language: (sp < 0 ? info : info.slice(0, sp)) || null, meta: sp < 0 ? "" : info.slice(sp + 1).trim() };
      },
    },
    hr: { node: "horizontalRule", getAttrs: (tok) => ({ ...DEFAULT_DIVIDER, ...(tok.meta as { divider?: DividerAttrs } | null)?.divider }) },
    image: {
      node: "image",
      getAttrs: (tok) => ({ src: tok.attrGet("src"), title: tok.attrGet("title") || null, alt: tok.children?.map((c) => c.content).join("") || null, ...imageAttrs(tok.meta) }),
    },
    figure: {
      node: "figure",
      getAttrs: (tok) => {
        const meta = tok.meta as FigureMeta;
        return { src: meta.image.attrGet("src"), alt: meta.image.children?.map((c) => c.content).join("") || null, caption: meta.caption || null, ...imageAttrs(meta) };
      },
    },
    hardbreak: { node: "hardBreak" },
    em: { mark: "italic" },
    strong: { mark: "bold" },
    s: { mark: "strike" },
    mark: { mark: "highlight" },
    link: { mark: "link", getAttrs: (tok) => ({ href: tok.attrGet("href"), title: tok.attrGet("title") || null }) },
    code_inline: { mark: "code", noCloseToken: true },
    table: { block: "table" },
    thead: { ignore: true },
    tbody: { ignore: true },
    tr: { block: "tableRow" },
    th: { block: "tableHeader", getAttrs: cellAttrs },
    td: { block: "tableCell", getAttrs: cellAttrs },
    callout: { block: "callout", getAttrs: (tok) => ({ type: tok.meta.type, title: tok.meta.title, icon: tok.meta.blockAttrs?.icon ?? "", color: tok.meta.blockAttrs?.color ?? null }) },
  };
}

function backticksFor(node: PMNode, side: number): string {
  const ticks = /`+/g;
  let m: RegExpExecArray | null;
  let len = 0;
  if (node.isText) while ((m = ticks.exec(node.text!))) len = Math.max(len, m[0].length);
  let result = len > 0 && side > 0 ? " `" : "`";
  for (let i = 0; i < len; i++) result += "`";
  if (len > 0 && side < 0) result += " ";
  return result;
}

const ALIGN_RULES: Record<string, string> = { left: ":--- |", center: ":---: |", right: "---: |" };

function buildConverter(config: EditorConfig): MarkdownConverter {
  const b = config.base;
  const exts = config.extensions;
  const fences = exts.flatMap((e) => e.markdown?.fences ?? []);
  const retag: RetagOptions = {
    callouts: b.callouts,
    taskLists: b.taskLists,
    tables: b.tables,
    fences,
    hooks: exts.flatMap((e) => (e.markdown?.retag ? [e.markdown.retag] : [])),
  };

  function markdownIt(schema: Schema, inline: boolean): MarkdownIt {
    const md = markdownit({ html: false, linkify: false, typographer: false, breaks: false });
    if (b.highlight) md.use(mark);
    if (!b.images) md.disable("image");
    else md.inline.ruler.after("image", "image_attrs", imageAttrsRule);
    if (b.images && schema.nodes.figure) md.core.ruler.after("inline", "figures", figureRule);
    if (b.tables) md.core.ruler.before("text_join", "table_cells", tableCellsRule);
    else md.disable("table");
    if (b.listStyles || b.dividers) md.use(blockAttrsPlugin);
    md.use(blockColorPlugin);
    if (!b.dividers) md.disable("hr");
    if (!b.headings.length) md.disable(["heading", "lheading"]);
    if (!b.blockquote && !b.callouts.length) md.disable("blockquote");
    if (!b.lists && !b.taskLists) md.disable("list");
    if (!b.codeBlocks) md.disable(fences.length ? ["code"] : ["code", "fence"]);
    if (!b.links) md.disable(["link", "autolink", "reference"]);
    md.core.ruler.after("block", "pm_retag", (state) => retagTokens(state, state.tokens, retag));
    for (const e of exts) for (const plugin of e.markdown?.plugins ?? []) plugin(md, { schema, inline });
    return md;
  }

  const specs: Record<string, ParseSpec> = baseTokens(config);
  for (const r of fences) {
    if (!r.parse && r.node) specs[atomToken(r.node)] = { node: r.node, getAttrs: (tok) => ({ attrs: tok.meta.attrs, body: tok.content.replace(/\n$/, "") }) };
  }
  for (const e of exts) Object.assign(specs, e.markdown?.tokens);
  const normalizers = exts.flatMap((e) => (e.markdown?.normalize ? [e.markdown.normalize] : []));

  function specsFor(schema: Schema): Record<string, ParseSpec> {
    const out: Record<string, ParseSpec> = {};
    for (const [token, spec] of Object.entries(specs)) {
      const name = spec.block ?? spec.node ?? spec.mark;
      if (!name || schema.nodes[name] || schema.marks[name]) out[token] = spec;
    }
    return out;
  }

  const parsers = new WeakMap<Schema, MarkdownParser>();
  const inlineParsers = new WeakMap<Schema, MarkdownParser>();

  function parse(md: string, schema: Schema = blockSchema): PMNode {
    let p = parsers.get(schema);
    if (!p) parsers.set(schema, (p = new MarkdownParser(schema, markdownIt(schema, false), specsFor(schema))));
    let doc = p.parse(md.replace(/\r\n?/g, "\n"));
    for (const n of normalizers) {
      try {
        doc = n(doc);
      } catch (e) {
        // a broken normaliser leaves the parsed document editable
        console.error("vue-wysiwyg-component: markdown normalize hook failed", e);
      }
    }
    return doc;
  }

  function parseInline(md: string, schema: Schema = inlineSchema): PMNode {
    let p = inlineParsers.get(schema);
    if (!p) {
      const it = markdownIt(schema, true);
      // prosemirror-markdown only needs `parse`; wrap markdown-it's inline token in one paragraph
      const tokenizer = {
        parse(src: string, env: unknown): Token[] {
          const inline = it.parseInline(src, env as Record<string, unknown>)[0];
          if (!inline) return [];
          const Tok = inline.constructor as new (type: string, tag: string, nesting: 1 | 0 | -1) => Token;
          return [new Tok("paragraph_open", "p", 1), inline, new Tok("paragraph_close", "p", -1)];
        },
      };
      p = new MarkdownParser(schema, tokenizer as unknown as MarkdownIt, specsFor(schema));
      inlineParsers.set(schema, p);
    }
    return p.parse(md.replace(/\s*\n\s*/g, " ").trim());
  }

  // set by the link mark's `open` so `text` skips escaping inside `<autolinks>`
  let inAutolink = false;

  function isPlainURL(link: { attrs: Record<string, unknown>; isInSet(set: readonly unknown[]): boolean }, parent: PMNode, index: number): boolean {
    if (link.attrs.title || !/^\w+:/.test(String(link.attrs.href))) return false;
    const content = parent.child(index);
    if (!content.isText || content.text !== link.attrs.href || content.marks[content.marks.length - 1] !== link) return false;
    return index === parent.childCount - 1 || !link.isInSet(parent.child(index + 1).marks);
  }

  const marks: Record<string, MarkSpec> = {
    italic: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
    bold: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
    strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    highlight: { open: "==", close: "==", mixable: true, expelEnclosingWhitespace: true },
    link: {
      open(_state, mark, parent, index) {
        inAutolink = isPlainURL(mark, parent, index);
        return inAutolink ? "<" : "[";
      },
      close(_state, mark) {
        const auto = inAutolink;
        inAutolink = false;
        if (auto) return ">";
        const title = mark.attrs.title ? ` "${String(mark.attrs.title).replace(/"/g, String.raw`\"`)}"` : "";
        return `](${String(mark.attrs.href ?? "").replace(/[()"]/g, String.raw`\$&`)}${title})`;
      },
      mixable: true,
    },
    code: {
      open: (_state, _mark, parent, index) => backticksFor(parent.child(index), -1),
      close: (_state, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
      escape: false,
    },
  };
  for (const e of exts) Object.assign(marks, e.markdown?.marks as Record<string, MarkSerializer> | undefined);

  const escapes = [...(b.highlight ? ["=(?==)"] : []), ...exts.flatMap((e) => (e.markdown?.escape ? [e.markdown.escape] : []))];
  const options = { hardBreakNodeName: "hardBreak", escapeExtraCharacters: escapes.length ? new RegExp(escapes.join("|"), "g") : undefined, strict: false };

  function writeFence(state: MarkdownSerializerState, node: PMNode, info: string, body: string) {
    const fence = fenceFor(body);
    state.write(fence + info + "\n");
    if (body) {
      state.text(body, false);
      state.write("\n");
    }
    state.write(fence);
    state.closeBlock(node);
  }

  function contentMarkdown(node: PMNode): string {
    return fragmentMarkdown(converter, node.content, node.type.schema);
  }

  function sectionsMarkdown(node: PMNode): string {
    const sections: Section[] = [];
    node.forEach((child) => sections.push({ label: String(child.attrs.label ?? ""), body: contentMarkdown(child) }));
    return joinSections(sections);
  }

  function inlineMarkdown(content: Fragment): string {
    const schema = content.firstChild?.type.schema;
    if (!schema || !content.size) return "";
    return serializeInline(schema.topNodeType.create(null, schema.nodes.paragraph!.create(null, content)));
  }

  const helpers: SerializeHelpers = { writeFence, contentMarkdown, sectionsMarkdown, inlineMarkdown };

  function imageSyntax(state: MarkdownSerializerState, node: PMNode): string {
    const caption = String(node.attrs.caption ?? node.attrs.title ?? "");
    const title = caption ? ` "${caption.replace(/"/g, String.raw`\"`)}"` : "";
    return `![${state.esc(node.attrs.alt || "")}](${String(node.attrs.src).replace(/[()]/g, String.raw`\$&`)}${title})${formatImageAttrs(node.attrs as ImageAttrs)}`;
  }

  function writeListAttrs(state: MarkdownSerializerState, node: PMNode) {
    const attrs = formatListAttrs({ style: node.attrs.listStyle as ListAttrs["style"], marker: node.attrs.marker as string | null });
    if (!attrs) return;
    (state as MarkdownSerializerState & { flushClose(size: number): void }).flushClose(1);
    state.write(attrs);
    state.closeBlock(node.lastChild!);
  }

  // cells are one line: typed `<br>` text is marked with U+0000 while serialising, then escaped as `\<`
  let cellSerializer: MarkdownSerializer | null = null;

  function cellText(cell: PMNode): string {
    cellSerializer ??= new MarkdownSerializer(
      {
        ...nodes,
        hardBreak(state) {
          state.write("<br>");
        },
        text(state, node) {
          state.text(node.text!.replace(/<(br\s*\/?>)/gi, "\u0000$1"), !inAutolink);
        },
      },
      marks,
      options,
    );
    const doc = cell.type.schema.topNodeType.create(null, cell.content);
    return cellSerializer
      .serialize(doc, { tightLists: true })
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\u0000/g, String.raw`\<`)
      .replace(/\|/g, String.raw`\|`);
  }

  function serializeTable(state: MarkdownSerializerState, node: PMNode) {
    const rows: string[][] = [];
    node.forEach((row) => {
      const cells: string[] = [];
      row.forEach((cell) => cells.push(cellText(cell)));
      rows.push(cells);
    });
    const first = node.firstChild;
    const cols = Math.max(1, ...rows.map((r) => r.length));
    let header = true;
    first?.forEach((cell) => {
      if (cell.type.name !== "tableHeader") header = false;
    });
    const aligns = Array.from({ length: cols }, (_, i) => (first && i < first.childCount ? (first.child(i).attrs.align as string | null) : null));
    const line = (cells: string[]) => "| " + Array.from({ length: cols }, (_, i) => cells[i] ?? "").join(" | ") + " |";
    const body = header ? rows.slice(1) : rows;
    state.write(line(header ? rows[0]! : []) + "\n");
    state.write("|" + aligns.map((a) => " " + (ALIGN_RULES[a ?? ""] ?? "--- |")).join("") + (body.length ? "\n" : ""));
    state.write(body.map(line).join("\n"));
    state.closeBlock(node);
  }

  const nodes: Record<string, NodeFn> = {
    blockquote(state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },
    callout(state, node) {
      const title = String(node.attrs.title ?? "").trim();
      state.write(`> [!${String(node.attrs.type).toUpperCase()}]${title ? " " + title : ""}\n`);
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
      const attrs = formatBlockAttrs([
        ["icon", node.attrs.icon as string],
        ["color", node.attrs.color as string | null],
      ]);
      if (!attrs) return;
      (state as MarkdownSerializerState & { flushClose(size: number): void }).flushClose(1);
      state.write(attrs);
      state.closeBlock(node);
    },
    codeBlock(state, node) {
      const lang = String(node.attrs.language ?? "");
      const meta = String(node.attrs.meta ?? "");
      writeFence(state, node, lang ? lang + (meta ? " " + meta : "") : "", node.textContent);
    },
    heading(state, node) {
      state.write(state.repeat("#", node.attrs.level) + " ");
      state.renderInline(node, false);
      state.closeBlock(node);
    },
    horizontalRule(state, node) {
      state.write("---");
      const attrs = formatDividerAttrs(node.attrs as DividerAttrs);
      if (attrs) {
        state.ensureNewLine();
        state.write(attrs);
      }
      state.closeBlock(node);
    },
    bulletList(state, node) {
      state.renderList(node, "  ", () => "- ");
      writeListAttrs(state, node);
    },
    orderedList(state, node) {
      const start = (node.attrs.start as number) || 1;
      const maxW = String(start + node.childCount - 1).length;
      const space = state.repeat(" ", maxW + 2);
      state.renderList(node, space, (i) => {
        const n = String(start + i);
        return state.repeat(" ", maxW - n.length) + n + ". ";
      });
      writeListAttrs(state, node);
    },
    listItem(state, node) {
      state.renderContent(node);
    },
    taskList(state, node) {
      state.renderList(node, "  ", () => "- ");
    },
    taskItem(state, node) {
      state.write(node.attrs.checked ? "[x] " : "[ ] ");
      state.renderContent(node);
    },
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    image(state, node) {
      state.write(imageSyntax(state, node));
    },
    figure(state, node) {
      state.write(imageSyntax(state, node));
      state.closeBlock(node);
    },
    hardBreak(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type !== node.type) {
          state.write("  \n");
          return;
        }
      }
    },
    text(state, node) {
      state.text(node.text!, !inAutolink);
    },
    table: serializeTable,
    tableRow() {},
    tableCell() {},
    tableHeader() {},
  };
  for (const r of fences) {
    if (r.parse || !r.node) continue;
    const kind = r.kind;
    nodes[r.node] = (state, node) => writeFence(state, node, formatInfo(kind, (node.attrs.attrs ?? {}) as Record<string, string>), String(node.attrs.body ?? ""));
  }
  for (const e of exts) {
    for (const [name, fn] of Object.entries(e.markdown?.nodes ?? {}) as [string, NodeSerializer][]) {
      nodes[name] = (state, node, parent, index) => fn(state, node, parent, index, helpers);
    }
  }

  const serializer = new MarkdownSerializer(nodes, marks, options);

  function serialize(doc: PMNode): string {
    return serializer.serialize(doc, { tightLists: true }).trimEnd() + "\n";
  }

  function serializeInline(doc: PMNode): string {
    return serializer.serialize(doc, { tightLists: true }).replace(/\s*\n\s*/g, " ").trim();
  }

  function serializeNode(node: PMNode): string {
    const schema = node.type.schema;
    return serialize(schema.topNodeType.create(null, node.isBlock ? [node] : [schema.nodes.paragraph!.create(null, [node])])).trimEnd();
  }

  const blockSchema = schemaFor(config);
  const inlineSchema = schemaFor(config, true);

  const converter: MarkdownConverter = {
    config,
    schema: blockSchema,
    inlineSchema,
    parse,
    parseInline,
    serialize,
    serializeInline,
    serializeNode,
    slice: (md, schema = blockSchema) => Slice.maxOpen(parse(md, schema).content),
    toHtml(md) {
      const doc = parse(md);
      return fragmentHtml(doc.content, doc.type.schema);
    },
  };
  return converter;
}

export function fragmentHtml(content: Fragment, schema: Schema): string {
  const div = document.createElement("div");
  div.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(content, { document }));
  return div.innerHTML;
}

export function fragmentMarkdown(markdown: MarkdownConverter, content: Fragment | readonly PMNode[], schema: Schema): string {
  return markdown.serialize(schema.topNodeType.create(null, content as Fragment | PMNode[])).trimEnd();
}

const converters = new WeakMap<EditorConfig, MarkdownConverter>();

export function markdownFor(config: EditorConfig): MarkdownConverter {
  let c = converters.get(config);
  if (!c) converters.set(config, (c = buildConverter(config)));
  return c;
}

export function createMarkdown(extensions: readonly EditorExtension[] = NO_EXTENSIONS, options: { base?: BaseOptions } = {}): MarkdownConverter {
  return markdownFor(resolveConfig("markdown", options.base, extensions));
}
