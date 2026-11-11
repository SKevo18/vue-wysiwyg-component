// Inline blocks: chip-like inline atoms (page links, mentions, a host's quiz blank) with a Vue view, caret handling
// that steps over the chip like one character, and an inline markdown syntax.
import { Extension, Node, mergeAttributes, type AnyExtension, type Editor } from "@tiptap/core";
import type { Node as PMNode, NodeType, TagParseRule } from "@tiptap/pm/model";
import { NodeSelection, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { StateInline } from "markdown-it";
import type { Component } from "vue";
import type { EditorExtension, EditorFormat, SlashItemDef } from "./types";

export type InlineAttrValue = string | number | boolean | null;

export interface InlineSyntax {
  /**
   * tried at every inline position where markdown-it stops for a special character, so it has to start with one of
   * `` \n ! # $ % & * + - : < = > @ [ \ ] ^ _ ` { } ~ ``. it is made sticky; a match must not span lines
   */
  pattern: RegExp;
  /** attributes of the chip from a match; null leaves the text to the other rules */
  parse(match: RegExpExecArray): Record<string, unknown> | null;
  /** the chip's markdown; null writes its `text` */
  serialize(attrs: Record<string, unknown>): string | null;
  /** the markdown-it inline rule this one runs before, default `link` */
  before?: string;
}

export interface InlineBlockOptions {
  /** node name */
  name: string;
  /** attributes and their defaults. html keeps each as `data-<name>` (kebab case), numbers and booleans as text */
  attrs: Record<string, InlineAttrValue>;
  /** what a reader sees without the view: html fallback, plain text, copy */
  text(attrs: Record<string, unknown>): string;
  /** the Vue view; wrap it in `InlineChip` for the shared chip look and selection styling */
  view?: Component;
  /** html element: a `span`, or an `a` when `href` returns an address */
  html?: {
    class?: string | ((attrs: Record<string, unknown>) => string);
    href?: (attrs: Record<string, unknown>) => string | null;
    /** more parse rules, e.g. an older element of the same chip */
    parse?: TagParseRule[];
  };
  markdown?: InlineSyntax;
  slash?: SlashItemDef[];
  formats?: EditorFormat[];
  messages?: EditorExtension["messages"];
  /** more tiptap extensions shipped with the chip (an input rule, a suggestion menu) */
  tiptap?: AnyExtension[];
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function attrSpec(name: string, fallback: InlineAttrValue) {
  const data = `data-${kebab(name)}`;
  return {
    default: fallback,
    parseHTML: (dom: HTMLElement): InlineAttrValue | null => {
      const v = dom.getAttribute(data);
      // null keeps what a parse rule's getAttrs set, else the default
      if (v === null) return null;
      if (typeof fallback === "boolean") return v === "true" || v === "";
      if (typeof fallback === "number") return Number.isFinite(Number(v)) ? Number(v) : fallback;
      return v;
    },
    renderHTML: (a: Record<string, unknown>) => {
      const v = a[name];
      return v === null || v === undefined || v === "" || v === false ? {} : { [data]: String(v) };
    },
  };
}

/** markdown-it inline rule producing a `<token>` with the parsed attributes as meta */
export function inlineSyntaxRule(syntax: InlineSyntax, token: string) {
  // sticky, so a match has to start at the current position
  const re = new RegExp(syntax.pattern.source, syntax.pattern.flags.replace(/[gy]/g, "") + "y");
  return (state: StateInline, silent: boolean): boolean => {
    re.lastIndex = state.pos;
    const m = re.exec(state.src);
    if (!m || state.pos + m[0].length > state.posMax || m[0].includes("\n")) return false;
    const attrs = syntax.parse(m);
    if (!attrs) return false;
    if (!silent) state.push(token, "span", 0).meta = attrs;
    state.pos += m[0].length;
    return true;
  };
}

/** a caret next to a chip of `type` steps over it; Backspace and Delete remove it */
function chipCommand(type: () => NodeType | undefined, key: "left" | "right" | "backspace" | "delete") {
  return ({ editor }: { editor: Editor }): boolean => {
    const state = editor.state;
    const dispatch = (tr: Transaction) => editor.view.dispatch(tr);
    const t = type();
    const sel = state.selection;
    const dir = key === "left" || key === "backspace" ? -1 : 1;
    if (sel instanceof NodeSelection && sel.node.type === t) {
      if (key === "backspace" || key === "delete") return false;
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, dir < 0 ? sel.from : sel.to)).scrollIntoView());
      return true;
    }
    if (!(sel instanceof TextSelection) || !sel.empty) return false;
    const $c = sel.$from;
    const near: PMNode | null | undefined = dir < 0 ? $c.nodeBefore : $c.nodeAfter;
    if (!near || near.type !== t) return false;
    const other = dir < 0 ? $c.pos - near.nodeSize : $c.pos + near.nodeSize;
    if (key === "left" || key === "right") dispatch(state.tr.setSelection(TextSelection.create(state.doc, other)).scrollIntoView());
    else dispatch(state.tr.delete(Math.min(other, $c.pos), Math.max(other, $c.pos)).scrollIntoView());
    return true;
  };
}

function chipKeymap(type: () => NodeType | undefined) {
  return { ArrowLeft: chipCommand(type, "left"), ArrowRight: chipCommand(type, "right"), Backspace: chipCommand(type, "backspace"), Delete: chipCommand(type, "delete") };
}

/** the inline atom node of an inline block, without its markdown and view */
export function inlineBlockNode(o: Pick<InlineBlockOptions, "name" | "attrs" | "text" | "html">) {
  const cls = o.html?.class ?? `wy-chip wy-${kebab(o.name)}`;
  const type = kebab(o.name);
  return Node.create({
    name: o.name,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes() {
      return Object.fromEntries(Object.entries(o.attrs).map(([k, v]) => [k, attrSpec(k, v)]));
    },
    parseHTML() {
      return [{ tag: `span[data-type="${type}"]` }, { tag: `a[data-type="${type}"]` }, ...(o.html?.parse ?? [])];
    },
    renderHTML({ node, HTMLAttributes }) {
      const attrs = node.attrs as Record<string, unknown>;
      const href = o.html?.href?.(attrs) ?? null;
      const base = mergeAttributes({ "data-type": type, class: typeof cls === "function" ? cls(attrs) : cls }, HTMLAttributes);
      return href ? ["a", mergeAttributes(base, { href }), o.text(attrs)] : ["span", base, o.text(attrs)];
    },
    renderText({ node }) {
      return o.text(node.attrs as Record<string, unknown>);
    },
    addKeyboardShortcuts() {
      return chipKeymap(() => this.editor.schema.nodes[o.name]);
    },
  });
}

/** the markdown-it token of an inline block, e.g. for `FenceContext.inline` */
export function inlineBlockToken(name: string): string {
  return `inline_${name}`;
}

/**
 * A chip-like inline atom: an inline node with a Vue view that a caret steps over like one character (arrow keys
 * move past it, Backspace and Delete remove it, text types before and after it) and an optional inline markdown
 * syntax. Base page links and mentions are built with it; hosts use it for their own chips.
 */
export function defineInlineBlock(o: InlineBlockOptions): EditorExtension {
  const token = inlineBlockToken(o.name);
  const md = o.markdown;
  return {
    name: o.name,
    formats: o.formats,
    tiptap: [inlineBlockNode(o), ...(o.tiptap ?? [])],
    nodeViews: o.view ? { [o.name]: o.view } : undefined,
    markdown: md
      ? {
          plugins: [(it) => it.inline.ruler.before(md.before ?? "link", token, inlineSyntaxRule(md, token))],
          tokens: { [token]: { node: o.name, getAttrs: (tok) => ({ ...(tok.meta as Record<string, unknown>) }) } },
          nodes: {
            [o.name](state, node) {
              const attrs = node.attrs as Record<string, unknown>;
              const out = md.serialize(attrs);
              if (out !== null) state.write(out);
              else state.text(o.text(attrs));
            },
          },
        }
      : undefined,
    slash: o.slash,
    messages: o.messages,
  };
}

/** keyboard behaviour of chips without the rest (for a host chip node built elsewhere) */
export function inlineChipKeys(name: string) {
  return Extension.create({
    name: `${name}ChipKeys`,
    addKeyboardShortcuts() {
      return chipKeymap(() => this.editor.schema.nodes[name]);
    },
  });
}

/** `[`, `]` and `\` escaped, line breaks as spaces: a label inside `@[…]` */
export function escapeChipLabel(label: string): string {
  return label.replace(/[\\[\]]/g, "\\$&").replace(/\s*\n\s*/g, " ");
}

/** the label of an `@[label](…)` match with its escapes resolved */
export function unescapeChipLabel(label: string): string {
  return label.replace(/\\(.)/g, "$1");
}

/** `@[label](target)`: group 1 the escaped label, group 2 the target (no spaces or parentheses) */
export const AT_LINK = /@\[((?:\\.|[^\\\]\n[])*)\]\(([^()\s\\]+)\)/;
