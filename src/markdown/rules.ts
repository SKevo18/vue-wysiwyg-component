import type { StateCore, StateInline, Token } from "markdown-it";
import { parseAttrLine } from "../core/attrs";
import { isBgToken, isTextToken } from "../core/colors";
import { newBlockId, parseInfo, splitSections, type FenceInfo } from "../core/info";
import { parseImageAttrs, type ImageAttrs } from "../core/media";
import type { FenceContext, FenceRule } from "../types";

export interface FigureMeta extends ImageAttrs {
  image: Token;
  caption: string;
}

export function imageAttrsRule(state: StateInline, silent: boolean): boolean {
  if (silent || state.src.charCodeAt(state.pos) !== 0x7b || state.pending) return false;
  const prev = state.tokens[state.tokens.length - 1];
  if (!prev || prev.type !== "image") return false;
  const m = /^\{([^{}\n]*)\}/.exec(state.src.slice(state.pos, state.posMax));
  if (!m) return false;
  const attrs = parseImageAttrs(m[1]!);
  if (!attrs) return false;
  prev.meta = { ...prev.meta, ...attrs };
  state.pos += m[0].length;
  return true;
}

export interface SpanColors {
  /** text token, `red` */
  color: string | null;
  /** background token, `yellow_bg` */
  bg: string | null;
}

/** `color=red bg=yellow`; `bg` also takes `yellow_bg`, `color` also takes a background token */
export function parseSpanAttrs(fields: Record<string, string>): SpanColors | null {
  const out: SpanColors = { color: null, bg: null };
  for (const [k, v] of Object.entries(fields)) {
    if (k === "color" && isTextToken(v)) out.color = v;
    else if (k === "color" && isBgToken(v) && !fields.bg) out.bg = v;
    else if (k === "bg" && (isTextToken(v) || isBgToken(v))) out.bg = isBgToken(v) ? v : `${v}_bg`;
    else return null;
  }
  return out;
}

const SPAN_ATTRS_RE = /^\{[^{}\n]*\}/;

/** `[text]{color=red bg=yellow}`: text colour and background colour marks around the bracketed inline content */
export function colorSpanRule(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x5b) return false;
  const labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, false);
  if (labelEnd < 0) return false;
  const m = SPAN_ATTRS_RE.exec(state.src.slice(labelEnd + 1, state.posMax));
  const fields = m ? parseAttrLine(m[0]) : null;
  const span = fields && parseSpanAttrs(fields);
  if (!m || !span) return false;
  if (!silent) {
    const max = state.posMax;
    state.pos += 1;
    state.posMax = labelEnd;
    if (span.color) state.push("text_color_open", "span", 1).meta = { color: span.color };
    if (span.bg) state.push("bg_color_open", "mark", 1).meta = { color: span.bg };
    state.md.inline.tokenize(state);
    if (span.bg) state.push("bg_color_close", "mark", -1);
    if (span.color) state.push("text_color_close", "span", -1);
    state.posMax = max;
  }
  state.pos = labelEnd + 1 + m[0].length;
  return true;
}

export function figureRule(state: StateCore) {
  const tokens = state.tokens;
  for (let i = 0; i + 2 < tokens.length; i++) {
    const inline = tokens[i + 1]!;
    if (tokens[i]!.type !== "paragraph_open" || inline.type !== "inline" || tokens[i + 2]!.type !== "paragraph_close") continue;
    const prev = i > 0 ? tokens[i - 1]!.type : "";
    if (prev === "list_item_open" || prev === "task_item_open") continue;
    const image = inline.children?.length === 1 ? inline.children[0]! : null;
    if (!image || image.type !== "image") continue;
    const attrs = (image.meta as ImageAttrs | null) ?? { width: null, align: null };
    const fig = new state.Token("figure", "figure", 0);
    fig.block = true;
    fig.map = tokens[i]!.map;
    fig.meta = { image, caption: String(image.attrGet("title") ?? ""), width: attrs.width, align: attrs.align } satisfies FigureMeta;
    tokens.splice(i, 3, fig);
  }
}

const CELL_BREAK = /<br\s*\/?>/gi;

/** an all-empty header row is dropped (that is how a headerless table is written); `\<br>` stays text; must run before `text_join` */
export function tableCellsRule(state: StateCore) {
  const tokens = state.tokens;
  let inCell = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === "th_open" || t.type === "td_open") inCell = true;
    else if (t.type === "th_close" || t.type === "td_close") inCell = false;
    else if (t.type === "inline" && inCell && t.children) t.children = splitCellBreaks(state, t.children);
    else if (t.type === "thead_open" && dropEmptyHead(tokens, i)) i--;
  }
}

function splitCellBreaks(state: StateCore, children: Token[]): Token[] {
  const out: Token[] = [];
  for (const child of children) {
    const parts = child.type === "text" ? child.content.split(CELL_BREAK) : [];
    if (parts.length < 2) {
      out.push(child);
      continue;
    }
    parts.forEach((part, k) => {
      if (k > 0) out.push(new state.Token("hardbreak", "br", 0));
      if (!part) return;
      const text = new state.Token("text", "", 0);
      text.content = part;
      out.push(text);
    });
  }
  return out;
}

function dropEmptyHead(tokens: Token[], i: number): boolean {
  let end = i;
  while (end < tokens.length && tokens[end]!.type !== "thead_close") end++;
  if (tokens[end + 1]?.type !== "tbody_open") return false;
  for (let k = i; k < end; k++) if (tokens[k]!.type === "inline" && tokens[k]!.content.trim()) return false;
  tokens.splice(i, end - i + 1);
  return true;
}

const CALLOUT_RE = /^\[!([A-Za-z]+)\][ \t]*([^\n]*)(?:\n|$)/;

function calloutAt(tokens: Token[], i: number, kinds: readonly string[]): { type: string; title: string; inline: Token; rest: string; close: number } | null {
  const inline = tokens[i + 2];
  if (tokens[i]?.type !== "blockquote_open" || tokens[i + 1]?.type !== "paragraph_open" || inline?.type !== "inline") return null;
  const m = CALLOUT_RE.exec(inline.content);
  const type = m?.[1]!.toLowerCase() ?? "";
  if (!m || !kinds.includes(type)) return null;
  let depth = 0;
  for (let j = i; j < tokens.length; j++) {
    const t = tokens[j]!.type;
    if (t === "blockquote_open") depth++;
    else if (t === "blockquote_close" && --depth === 0) return { type, title: m[2]!.trim(), inline, rest: inline.content.slice(m[0].length), close: j };
  }
  return null;
}

export function retagCallouts(tokens: Token[], kinds: readonly string[]) {
  for (let i = 0; i < tokens.length; i++) {
    const callout = calloutAt(tokens, i, kinds);
    if (!callout) continue;
    tokens[i]!.type = "callout_open";
    tokens[i]!.meta = { ...tokens[i]!.meta, type: callout.type, title: callout.title };
    tokens[callout.close]!.type = "callout_close";
    if (callout.rest.trim() === "") {
      tokens.splice(i + 1, 3);
    } else {
      callout.inline.content = callout.rest;
      callout.inline.children = [];
    }
  }
}

const TASK_RE = /^\[([ xX])\][ \t]+/;

export function retagTaskLists(tokens: Token[]) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.type !== "bullet_list_open") continue;
    const items: { open: Token; inline: Token; checked: boolean }[] = [];
    let ok = true;
    let depth = 0;
    let j = i;
    for (; j < tokens.length; j++) {
      const t = tokens[j]!;
      if (t.type === "bullet_list_open" || t.type === "ordered_list_open") depth++;
      else if (t.type === "bullet_list_close" || t.type === "ordered_list_close") {
        if (--depth === 0) break;
      } else if (t.type === "list_item_open" && depth === 1) {
        const para = tokens[j + 1];
        const inline = tokens[j + 2];
        const m = para?.type === "paragraph_open" && inline?.type === "inline" ? TASK_RE.exec(inline.content) : null;
        if (!m) {
          ok = false;
          break;
        }
        items.push({ open: t, inline: inline!, checked: m[1] !== " " });
      }
    }
    if (!ok || items.length === 0) continue;
    tokens[i]!.type = "task_list_open";
    tokens[j]!.type = "task_list_close";
    depth = 0;
    for (let k = i; k <= j; k++) {
      const t = tokens[k]!;
      if (t.type === "task_list_open" || t.type === "bullet_list_open" || t.type === "ordered_list_open") depth++;
      else if (t.type === "task_list_close" || t.type === "bullet_list_close" || t.type === "ordered_list_close") depth--;
      else if (depth === 1 && t.type === "list_item_open") t.type = "task_item_open";
      else if (depth === 1 && t.type === "list_item_close") t.type = "task_item_close";
    }
    for (const it of items) {
      it.open.meta = { ...it.open.meta, checked: it.checked };
      it.inline.content = it.inline.content.replace(TASK_RE, "");
      it.inline.children = [];
    }
  }
}

export function wrapTableCells(state: StateCore, tokens: Token[]) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if ((t.type !== "th_open" && t.type !== "td_open") || tokens[i + 1]?.type !== "inline") continue;
    tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));
    tokens.splice(i + 3, 0, new state.Token("paragraph_close", "p", -1));
    i += 3;
  }
}

export function atomToken(node: string): string {
  return `${node}__fence`;
}

export interface RetagOptions {
  callouts: readonly string[];
  taskLists: boolean;
  tables: boolean;
  fences: readonly FenceRule[];
  hooks: ((tokens: Token[], ctx: { Token: typeof Token }) => void)[];
}

/** runs on the block stream before the inline rule so nested container bodies are retagged too and their inline content is parsed once by the outer core chain */
export function retagTokens(state: StateCore, tokens: Token[], opts: RetagOptions) {
  retagFences(state, tokens, opts);
  if (opts.callouts.length) retagCallouts(tokens, opts.callouts);
  if (opts.taskLists) retagTaskLists(tokens);
  if (opts.tables) wrapTableCells(state, tokens);
  for (const hook of opts.hooks) hook(tokens, { Token: state.Token });
}

function spliceContainer(state: StateCore, tokens: Token[], i: number, name: string, meta: Record<string, unknown>, body: string, opts: RetagOptions): number {
  const open = new state.Token(`${name}_open`, "div", 1);
  open.block = true;
  open.meta = meta;
  const close = new state.Token(`${name}_close`, "div", -1);
  close.block = true;
  const inner: Token[] = [];
  state.md.block.parse(body.replace(/\n$/, ""), state.md, state.env, inner);
  if (inner.length === 0) {
    const text = new state.Token("inline", "", 0);
    text.content = "";
    text.children = [];
    inner.push(new state.Token("paragraph_open", "p", 1), text, new state.Token("paragraph_close", "p", -1));
  }
  retagTokens(state, inner, opts);
  tokens.splice(i, 1, open, ...inner, close);
  return inner.length + 1;
}

function spliceSections(state: StateCore, tokens: Token[], i: number, name: string, child: string, meta: Record<string, unknown>, body: string, opts: RetagOptions): number {
  const sections = splitSections(body.replace(/\n$/, ""));
  if (sections.length === 0) sections.push({ label: "", body: "" });
  const inner = sections.map(() => tokens[i]!);
  for (let k = sections.length - 1; k >= 0; k--) spliceContainer(state, inner, k, child, { label: sections[k]!.label }, sections[k]!.body, opts);
  const open = new state.Token(`${name}_open`, "div", 1);
  open.block = true;
  open.meta = meta;
  const close = new state.Token(`${name}_close`, "div", -1);
  close.block = true;
  tokens.splice(i, 1, open, ...inner, close);
  return inner.length + 1;
}

function findRule(rules: readonly FenceRule[], info: FenceInfo): FenceRule | null {
  for (let k = rules.length - 1; k >= 0; k--) {
    const r = rules[k]!;
    if (r.kind === info.kind && (!r.match || r.match(info))) return r;
  }
  return null;
}

function retagFences(state: StateCore, tokens: Token[], opts: RetagOptions) {
  if (!opts.fences.length) return;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== "fence") continue;
    const info = parseInfo(t.info.trim());
    const rule = findRule(opts.fences, info);
    if (!rule) continue;
    // an attribute line after the fence (`{color=…}`) stays with the block the fence becomes
    const blockAttrs = (t.meta as { blockAttrs?: Record<string, string> } | null)?.blockAttrs;
    const withAttrs = (meta: Record<string, unknown>) => (blockAttrs ? { ...meta, blockAttrs } : meta);
    if (rule.parse) {
      let advance = 0;
      const own = t.content.replace(/\n$/, "");
      const ctx: FenceContext = {
        info,
        body: own,
        token: t,
        container: (name, meta, body = own) => void (advance = spliceContainer(state, tokens, i, name, withAttrs(meta), body, opts)),
        sections: (name, child, meta, body = own) => void (advance = spliceSections(state, tokens, i, name, child, withAttrs(meta), body, opts)),
        atom: (name, meta) => {
          t.type = name;
          t.meta = withAttrs(meta);
        },
      };
      rule.parse(ctx);
      i += advance;
      continue;
    }
    if (!rule.node) continue;
    if (rule.ensureId && !info.attrs.id) info.attrs = { id: newBlockId(), ...info.attrs };
    t.meta = withAttrs({ kind: info.kind, attrs: info.attrs });
    t.type = atomToken(rule.node);
  }
}
