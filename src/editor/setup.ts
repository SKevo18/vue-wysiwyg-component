import { Node, type AnyExtension, type Extensions } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import { Placeholder } from "@tiptap/extensions";
import type { Component } from "vue";
import { schemaExtensions } from "../schema";
import CalloutView from "../nodes/CalloutView.vue";
import CodeBlockView from "../nodes/CodeBlockView.vue";
import DetailsView from "../nodes/DetailsView.vue";
import DividerView from "../nodes/DividerView.vue";
import FigureView from "../nodes/FigureView.vue";
import InlineImageView from "../nodes/InlineImageView.vue";
import MathBlockView from "../nodes/MathBlockView.vue";
import MathInlineView from "../nodes/MathInlineView.vue";
import { PasteUrl } from "./pasteUrl";
import { BlockKeys, ClickAway, HostKeys, InlineAtomClick, InlineKeys, LinkClicks, ScopedSelectAll, SlashCommand, TableCells, blockStopEvent, openHref } from "./behaviour";
import { filterItems, groupLabel } from "./catalog";
import { clipboardExtension } from "./clipboard";
import { ContextStorage, type EditorContext } from "./context";
import { GutterHandle } from "./gutter";
import { ServerHistory, type HistoryBridge } from "./history";

const BASE_VIEWS: Record<string, Component> = {
  callout: CalloutView,
  codeBlock: CodeBlockView,
  details: DetailsView,
  horizontalRule: DividerView,
  figure: FigureView,
  image: InlineImageView,
  mathBlock: MathBlockView,
  mathInline: MathInlineView,
};

export interface SetupOptions {
  placeholder: string;
  gutter: { onInsertAfter(pos: number): void; onMenu(pos: number, grip: HTMLElement): void; menuOpen(): boolean } | null;
  bridge(): HistoryBridge | null;
  hostKeys(): Record<string, () => boolean>;
  /** the host's collaboration extensions; they replace the local undo history and own the document */
  collaboration: AnyExtension[] | null;
}

export function editorExtensions(ctx: EditorContext, opts: SetupOptions): Extensions {
  const views: Record<string, Component> = { ...BASE_VIEWS };
  for (const e of ctx.config.extensions) Object.assign(views, e.nodeViews);
  const base = schemaExtensions(ctx.config, ctx.inline, !opts.collaboration).map((ext): AnyExtension => {
    const view = views[ext.name];
    if (!view || !(ext instanceof Node)) return ext;
    return ext.extend({ addNodeView: () => VueNodeViewRenderer(view, { stopEvent: blockStopEvent }) });
  });
  const out: AnyExtension[] = [
    ...base,
    ContextStorage.configure({ context: ctx }),
    HostKeys.configure({ keys: opts.hostKeys }),
    ServerHistory.configure({ bridge: opts.bridge, collaborative: !!opts.collaboration }),
    InlineAtomClick,
    ClickAway,
    ScopedSelectAll,
    clipboardExtension(ctx.markdown, ctx.config.format === "markdown"),
  ];
  if (ctx.config.base.links) out.push(LinkClicks.configure({ open: (href, event) => openHref(ctx.services, href, event) }));
  if (ctx.inline) {
    out.push(InlineKeys, Placeholder.configure({ placeholder: opts.placeholder, showOnlyWhenEditable: true }));
    if (opts.collaboration) out.push(...opts.collaboration);
    return out;
  }
  out.push(
    BlockKeys,
    TableCells,
    Placeholder.configure({
      placeholder: ({ editor, node }) => (node.type.name === "heading" ? ctx.t("toolbar.heading", { n: node.attrs.level as number }) : editor.isEmpty ? opts.placeholder : ""),
      includeChildren: false,
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
    }),
    SlashCommand.configure({ items: (q) => filterItems(ctx.slashItems, q), groupLabel: (id) => groupLabel(ctx.config, id, ctx.text), t: (k) => ctx.t(k) }),
  );
  if (ctx.config.base.bookmarks || ctx.config.base.embeds) out.push(PasteUrl);
  if (opts.gutter) {
    const g = opts.gutter;
    out.push(GutterHandle.configure({ onInsertAfter: g.onInsertAfter, onMenu: g.onMenu, menuOpen: g.menuOpen, labels: () => ({ drag: ctx.t("gutter.drag"), add: ctx.t("gutter.add") }) }));
  }
  if (opts.collaboration) out.push(...opts.collaboration);
  return out;
}
