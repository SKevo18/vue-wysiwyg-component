import { getSchema, type AnyExtension, type Extensions } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import { BulletList, ListItem, ListKeymap, OrderedList, TaskItem, TaskList } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import { Table, TableRow } from "@tiptap/extension-table";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Dropcursor, Gapcursor, TrailingNode, UndoRedo } from "@tiptap/extensions";
import { CODE_LANGUAGES } from "../core/highlight";
import { HTML_CALLOUTS, MARKDOWN_CALLOUTS } from "../core/callouts";
import type { BaseOptions, EditorExtension, EditorFormat, HeadingLevel, ResolvedBase } from "../types";
import { Callout, Divider, FileChips, Figure, GenericCodeBlock, InlineDocument, InlineImage, InlineTableCell, InlineTableHeader, ListStyles } from "./nodes";
import { builtinExtensions } from "../builtins";

const ALL_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

export function resolveBase(format: EditorFormat, base: BaseOptions = {}): ResolvedBase {
  const html = format === "html";
  const callouts = base.callouts ?? true;
  const code = base.codeBlocks ?? true;
  return {
    headings: base.headings === false ? [] : (base.headings ?? (html ? [1, 2, 3] : ALL_LEVELS)),
    underline: base.underline ?? html,
    highlight: base.highlight ?? true,
    color: base.color ?? html,
    textAlign: base.textAlign ?? html,
    lists: base.lists ?? true,
    listStyles: base.listStyles ?? !html,
    taskLists: base.taskLists ?? true,
    blockquote: base.blockquote ?? true,
    callouts: callouts === true ? [...(html ? HTML_CALLOUTS : MARKDOWN_CALLOUTS)] : callouts === false ? [] : callouts,
    dividers: base.dividers ?? true,
    codeBlocks: code === true ? [...CODE_LANGUAGES] : code === false ? false : code,
    tables: base.tables ?? true,
    images: base.images ?? true,
    files: base.files ?? true,
    links: base.links ?? true,
    downscale: base.downscale ?? 2560,
    math: base.math ?? false,
    details: base.details ?? false,
    footnotes: base.footnotes ?? false,
    columns: base.columns ?? false,
    bookmarks: base.bookmarks ?? false,
    embeds: base.embeds ?? false,
    toc: base.toc ?? false,
    pageLinks: base.pageLinks ?? false,
    mentions: base.mentions ?? false,
    diagrams: base.diagrams === true ? ["mermaid", "plantuml"] : base.diagrams || [],
    plantumlServer: (base.plantumlServer ?? "https://www.plantuml.com/plantuml").replace(/\/+$/, ""),
    pageHref: base.pageHref ?? "/p/{id}",
  };
}

export interface EditorConfig {
  format: EditorFormat;
  base: ResolvedBase;
  extensions: EditorExtension[];
}

/** shared default, so callers without extensions hit the same cache entry */
export const NO_EXTENSIONS: readonly EditorExtension[] = [];
const configs = new WeakMap<readonly EditorExtension[], Map<string, EditorConfig>>();

export function resolveConfig(format: EditorFormat, base: BaseOptions | undefined, extensions: readonly EditorExtension[] = NO_EXTENSIONS): EditorConfig {
  let byKey = configs.get(extensions);
  if (!byKey) configs.set(extensions, (byKey = new Map()));
  const key = `${format}:${JSON.stringify(base ?? {})}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const resolved = resolveBase(format, base);
  const config: EditorConfig = {
    format,
    base: resolved,
    extensions: [...builtinExtensions(resolved), ...extensions.filter((e) => !e.formats || e.formats.includes(format))],
  };
  byKey.set(key, config);
  return config;
}

function coreExtensions(config: EditorConfig, inline: boolean, history: boolean): AnyExtension[] {
  const b = config.base;
  const lists = b.lists && !inline;
  const listItems = lists || (!inline && b.taskLists);
  const out: AnyExtension[] = [Bold];
  if (!inline && (b.blockquote || b.callouts.length > 0)) out.push(Blockquote);
  if (listItems) out.push(BulletList);
  out.push(Code);
  if (!inline) out.push(Document, Dropcursor.configure({ color: "var(--vc-accent)", width: 2 }), Gapcursor, HardBreak);
  if (!inline && b.headings.length) out.push(Heading.configure({ levels: b.headings }));
  if (history) out.push(UndoRedo.configure({ newGroupDelay: 500 }));
  out.push(Italic);
  if (listItems) out.push(ListItem);
  if (!inline) out.push(ListKeymap);
  if (b.links) out.push(Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https", HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }));
  if (lists) out.push(OrderedList);
  out.push(Paragraph, Strike, Text);
  if (b.underline) out.push(Underline);
  if (!inline) out.push(TrailingNode);
  return out;
}

/**
 * not cached: `history: false` leaves the local undo history out for a collaborative editor, whose
 * collaboration extension owns it. the history adds no schema, so `schemaFor` is the same either way.
 */
export function schemaExtensions(config: EditorConfig, inline = false, history = true): Extensions {
  const b = config.base;
  const html = config.format === "html";
  const out: AnyExtension[] = [];
  if (inline) out.push(InlineDocument);
  out.push(...coreExtensions(config, inline, history));
  if (b.highlight) out.push(Highlight.configure({ multicolor: html }));
  if (b.color) out.push(TextStyle, Color);
  if (b.textAlign && !inline) out.push(TextAlign.configure({ types: ["heading", "paragraph"] }));
  if (b.links && b.files) out.push(FileChips);
  if (!inline) {
    if (b.dividers) out.push(Divider);
    if (b.listStyles && b.lists) out.push(ListStyles);
    if (b.codeBlocks) out.push(GenericCodeBlock);
    if (b.images) out.push(InlineImage, Figure);
    if (b.tables) out.push(Table.configure({ resizable: true, cellMinWidth: 48 }), TableRow, InlineTableHeader, InlineTableCell);
    if (b.taskLists) out.push(TaskList, TaskItem.configure({ nested: true }));
    if (b.callouts.length) out.push(Callout);
  }
  for (const ext of config.extensions) out.push(...(ext.tiptap ?? []));
  return out;
}

const schemas = new WeakMap<EditorConfig, { block?: Schema; inline?: Schema }>();

export function schemaFor(config: EditorConfig, inline = false): Schema {
  let entry = schemas.get(config);
  if (!entry) schemas.set(config, (entry = {}));
  const key = inline ? "inline" : "block";
  return (entry[key] ??= getSchema(schemaExtensions(config, inline, false)));
}
