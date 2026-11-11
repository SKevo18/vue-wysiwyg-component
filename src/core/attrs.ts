import type { MarkdownIt, StateBlock, Token } from "markdown-it";
import { isPaletteToken } from "./palette";

export const ORDERED_STYLES = ["decimal", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"] as const;
export const BULLET_STYLES = ["disc", "circle", "square", "dash", "arrow"] as const;
export type OrderedStyle = (typeof ORDERED_STYLES)[number];
export type BulletStyle = (typeof BULLET_STYLES)[number];
export type ListKind = "bullet" | "ordered";

export interface ListAttrs {
  style: OrderedStyle | BulletStyle | null;
  /** one or two characters, bullet lists only; wins over `style` */
  marker: string | null;
}

export const DIVIDER_WIDTHS = [1, 2, 3, 4] as const;
export const DIVIDER_STYLES = ["solid", "dashed", "dotted", "double"] as const;
export const DIVIDER_DESIGNS = ["none", "star", "diamond", "dots", "fleuron"] as const;
export const DIVIDER_COLORS = ["red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
export type DividerStyle = (typeof DIVIDER_STYLES)[number];
export type DividerDesign = (typeof DIVIDER_DESIGNS)[number];

export interface DividerAttrs {
  /** px, 1..4 */
  width: number;
  /** palette name or `#rgb` / `#rrggbb`; null = the hairline colour */
  color: string | null;
  style: DividerStyle;
  design: DividerDesign;
  /** one or two characters; wins over `design` */
  char: string | null;
}

export const DEFAULT_DIVIDER: DividerAttrs = { width: 1, color: null, style: "solid", design: "none", char: null };

export const DIVIDER_GLYPHS: Record<Exclude<DividerDesign, "none">, string> = { star: "★", diamond: "◆", dots: "• • •", fleuron: "❦" };

const BULLET_GLYPHS: Partial<Record<BulletStyle, string>> = { dash: "–", arrow: "→" };

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

let segmenter: Intl.Segmenter | null = null;

function graphemes(s: string): Iterable<unknown> {
  if (typeof Intl.Segmenter !== "function") return s;
  segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return segmenter.segment(s);
}

/** grapheme clusters, so an emoji counts as one; no `"` because the attribute syntax cannot quote it */
export function validChar(s: string): boolean {
  if (!s || /[\s"]/.test(s)) return false;
  let n = 0;
  for (const _ of graphemes(s)) if (++n > 2) return false;
  return true;
}

export function parseAttrLine(line: string): Record<string, string> | null {
  const s = line.trim();
  if (s.length < 3 || s[0] !== "{" || s[s.length - 1] !== "}") return null;
  const fields: Record<string, string> = {};
  const re = /\s*([a-z]+)=(?:"([^"]*)"|([^\s"{}]+))\s*/gy;
  const body = s.slice(1, -1);
  let at = 0;
  while (at < body.length) {
    re.lastIndex = at;
    const m = re.exec(body);
    if (!m || m[1]! in fields) return null;
    fields[m[1]!] = m[2] ?? m[3]!;
    at = re.lastIndex;
  }
  return Object.keys(fields).length ? fields : null;
}

function formatFields(fields: [string, string][]): string {
  if (!fields.length) return "";
  return `{${fields.map(([k, v]) => (/^[^\s"{}=]+$/.test(v) ? `${k}=${v}` : `${k}="${v}"`)).join(" ")}}`;
}

export function parseListAttrs(fields: Record<string, string>, kind: ListKind | null): ListAttrs | null {
  const attrs: ListAttrs = { style: null, marker: null };
  for (const [k, v] of Object.entries(fields)) {
    if (k === "style") {
      const ordered = (ORDERED_STYLES as readonly string[]).includes(v);
      const bullet = (BULLET_STYLES as readonly string[]).includes(v);
      if (kind === "ordered" ? !ordered : kind === "bullet" ? !bullet : !ordered && !bullet) return null;
      attrs.style = v as ListAttrs["style"];
    } else if (k === "marker" && kind !== "ordered" && validChar(v)) {
      attrs.marker = v;
    } else {
      return null;
    }
  }
  return attrs;
}

export function formatListAttrs(attrs: Partial<ListAttrs>): string {
  if (attrs.marker) return formatFields([["marker", attrs.marker]]);
  if (attrs.style && attrs.style !== "decimal" && attrs.style !== "disc") return formatFields([["style", attrs.style]]);
  return "";
}

export function parseDividerAttrs(fields: Record<string, string>): DividerAttrs | null {
  const attrs: DividerAttrs = { ...DEFAULT_DIVIDER };
  for (const [k, v] of Object.entries(fields)) {
    if (k === "width" && /^[1-4]$/.test(v)) attrs.width = Number(v);
    else if (k === "color" && ((DIVIDER_COLORS as readonly string[]).includes(v) || HEX_RE.test(v))) attrs.color = v.toLowerCase();
    else if (k === "style" && (DIVIDER_STYLES as readonly string[]).includes(v)) attrs.style = v as DividerStyle;
    else if (k === "design" && (DIVIDER_DESIGNS as readonly string[]).includes(v)) attrs.design = v as DividerDesign;
    else if (k === "char" && validChar(v)) attrs.char = v;
    else return null;
  }
  return attrs;
}

export function formatDividerAttrs(attrs: Partial<DividerAttrs>): string {
  const fields: [string, string][] = [];
  if (attrs.width && attrs.width !== 1) fields.push(["width", String(attrs.width)]);
  if (attrs.color) fields.push(["color", attrs.color]);
  if (attrs.style && attrs.style !== "solid") fields.push(["style", attrs.style]);
  if (attrs.char) fields.push(["char", attrs.char]);
  else if (attrs.design && attrs.design !== "none") fields.push(["design", attrs.design]);
  return formatFields(fields);
}

function cssString(s: string): string {
  return `"${s.replace(/\\/g, String.raw`\\`).replace(/"/g, String.raw`\"`)}"`;
}

export function listLook(attrs: Partial<ListAttrs>): { class: string; style: string } {
  if (attrs.marker && validChar(attrs.marker)) return { class: "wy-list-marker", style: `--wy-list-marker: ${cssString(attrs.marker + " ")}` };
  const style = attrs.style;
  if (!style || style === "decimal" || style === "disc" || !parseListAttrs({ style }, null)) return { class: "", style: "" };
  const glyph = BULLET_GLYPHS[style as BulletStyle];
  return glyph ? { class: "wy-list-marker", style: `--wy-list-marker: ${cssString(glyph + " ")}` } : { class: `wy-list-${style}`, style: "" };
}

export function dividerOrnament(attrs: DividerAttrs): string {
  return attrs.char ?? (attrs.design === "none" ? "" : DIVIDER_GLYPHS[attrs.design]);
}

export function dividerStyle(attrs: DividerAttrs): string {
  const parts: string[] = [];
  const width = attrs.style === "double" ? attrs.width * 2 + 1 : attrs.width;
  if (width !== 1 && Number.isInteger(width)) parts.push(`--wy-divider-width: ${width}px`);
  if (attrs.style !== "solid" && (DIVIDER_STYLES as readonly string[]).includes(attrs.style)) parts.push(`--wy-divider-style: ${attrs.style}`);
  if (attrs.color && parseDividerAttrs({ color: attrs.color })) parts.push(`--wy-divider-color: ${attrs.color.startsWith("#") ? attrs.color : `var(--vc-tint-${attrs.color})`}`);
  return parts.join("; ");
}

function listOpen(tokens: Token[], close: Token): Token | null {
  const type = close.type.replace(/_close$/, "_open");
  for (let i = tokens.length - 2; i >= 0; i--) if (tokens[i]!.type === type && tokens[i]!.level === close.level) return tokens[i]!;
  return null;
}

function attrLineRule(state: StateBlock, startLine: number, _endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  const fields = parseAttrLine(state.src.slice(state.bMarks[startLine]! + state.tShift[startLine]!, state.eMarks[startLine]!));
  if (!fields) return false;
  if (silent) return state.listIndent >= 0 && parseListAttrs(fields, null) !== null;
  const prev = state.tokens[state.tokens.length - 1];
  if (prev?.type === "hr") {
    const divider = parseDividerAttrs(fields);
    if (!divider) return false;
    prev.meta = { ...prev.meta, divider };
  } else if (prev?.type === "bullet_list_close" || prev?.type === "ordered_list_close") {
    const list = parseListAttrs(fields, prev.type === "ordered_list_close" ? "ordered" : "bullet");
    const open = list && listOpen(state.tokens, prev);
    if (!list || !open) return false;
    open.meta = { ...open.meta, list };
  } else {
    return false;
  }
  state.line = startLine + 1;
  return true;
}

export function blockAttrsPlugin(md: MarkdownIt) {
  // before `lheading`: `---` under an attribute line is another rule, never a setext underline
  md.block.ruler.before("lheading", "block_attrs", attrLineRule, { alt: ["paragraph"] });
}

const ICON_GRAPHEMES = 8;

/** an emoji or a short text icon; no line breaks */
export function validIcon(s: string): boolean {
  if (!s || /[\r\n]/.test(s)) return false;
  let n = 0;
  for (const _ of graphemes(s)) if (++n > ICON_GRAPHEMES) return false;
  return true;
}

function validBlockAttrs(fields: Record<string, string>): boolean {
  return Object.entries(fields).every(([k, v]) => (k === "color" && isPaletteToken(v)) || (k === "icon" && validIcon(v)));
}

/** `{color=… icon=…}` right after a quote (on its opener) or a fence (on the fence token) lands in `meta.blockAttrs` */
function blockAttrsLineRule(state: StateBlock, startLine: number, _endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  const fields = parseAttrLine(state.src.slice(state.bMarks[startLine]! + state.tShift[startLine]!, state.eMarks[startLine]!));
  if (!fields || !validBlockAttrs(fields)) return false;
  // a quote ends at the line instead of taking it as a lazy continuation
  if (silent) return true;
  const prev = state.tokens[state.tokens.length - 1];
  const target = prev?.type === "fence" ? prev : prev?.type === "blockquote_close" ? listOpen(state.tokens, prev) : null;
  if (!target) return false;
  target.meta = { ...target.meta, blockAttrs: { ...(target.meta?.blockAttrs as Record<string, string> | undefined), ...fields } };
  state.line = startLine + 1;
  return true;
}

export function blockColorPlugin(md: MarkdownIt) {
  md.block.ruler.before("lheading", "wy_block_attrs_e2", blockAttrsLineRule, { alt: ["blockquote"] });
}

export function formatBlockAttrs(fields: [string, string | null | undefined][]): string {
  return formatFields(fields.filter((f): f is [string, string] => !!f[1]));
}
