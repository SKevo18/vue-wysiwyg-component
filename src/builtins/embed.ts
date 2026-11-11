import { Node, mergeAttributes } from "@tiptap/core";
import EmbedView from "../nodes/EmbedView.vue";
import { AppWindow } from "@lucide/vue";
import { EMBED_MAX_HEIGHT, EMBED_MIN_HEIGHT, EMBED_PROVIDERS, embedFor, embedSandbox, type EmbedProvider } from "../core/embeds";
import { formatInfo } from "../core/info";
import type { EditorExtension } from "../types";
import { infoUrl } from "./fenceText";

export function parseEmbedHeight(v: unknown): number | null {
  const s = String(v ?? "");
  if (!/^\d+$/.test(s)) return null;
  return Math.min(EMBED_MAX_HEIGHT, Math.max(EMBED_MIN_HEIGHT, Number(s)));
}

function provider(v: unknown, url: string): EmbedProvider {
  return (EMBED_PROVIDERS as readonly unknown[]).includes(v) ? (v as EmbedProvider) : (embedFor(url)?.provider ?? "generic");
}

/** attributes of an embed of `url`; `src` is always derived again, so a stored document cannot point the iframe elsewhere */
export function embedAttrs(url: string, stored: { provider?: unknown; height?: unknown } = {}) {
  const target = embedFor(url);
  return { url, src: target?.src ?? "", provider: stored.provider === undefined ? (target?.provider ?? "generic") : provider(stored.provider, url), height: parseEmbedHeight(stored.height) };
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return {
      url: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-url") ?? "", renderHTML: (a: { url: string }) => ({ "data-url": a.url }) },
      src: { default: "", parseHTML: (dom: HTMLElement) => embedFor(dom.getAttribute("data-url") ?? "")?.src ?? "", renderHTML: () => ({}) },
      provider: { default: "generic", parseHTML: (dom: HTMLElement) => provider(dom.getAttribute("data-provider"), dom.getAttribute("data-url") ?? ""), renderHTML: (a: { provider: string }) => ({ "data-provider": a.provider }) },
      height: { default: null, parseHTML: (dom: HTMLElement) => parseEmbedHeight(dom.getAttribute("data-height")), renderHTML: (a: { height: number | null }) => (a.height ? { "data-height": String(a.height) } : {}) },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const { src, height } = node.attrs as { src: string; height: number | null };
    const attrs = mergeAttributes({ "data-type": "embed", class: "wy-embed" }, HTMLAttributes);
    if (!src) return ["div", attrs, ["a", { href: node.attrs.url, target: "_blank", rel: "noopener noreferrer" }, node.attrs.url]];
    const frame = { src, sandbox: embedSandbox(src), allow: "fullscreen; picture-in-picture; encrypted-media; clipboard-write", referrerpolicy: "strict-origin-when-cross-origin", loading: "lazy", style: height ? `height: ${height}px` : null };
    return ["div", attrs, ["iframe", frame]];
  },
});

export const embedExtension: EditorExtension = {
  name: "embed",
  tiptap: [Embed],
  nodeViews: { embed: EmbedView },
  markdown: {
    fences: [{ kind: "embed", parse: (ctx) => ctx.atom("embed", embedAttrs(ctx.info.attrs.url ?? ctx.body.trim(), { provider: ctx.info.attrs.provider, height: ctx.info.attrs.height })) }],
    tokens: { embed: { node: "embed", getAttrs: (tok) => ({ url: tok.meta.url, src: tok.meta.src, provider: tok.meta.provider, height: tok.meta.height }) } },
    nodes: {
      embed(state, node, _parent, _index, h) {
        const height = node.attrs.height as number | null;
        h.writeFence(state, node, formatInfo("embed", { url: infoUrl(node.attrs.url), provider: String(node.attrs.provider ?? ""), height: height ? String(height) : "" }), "");
      },
    },
  },
  slash: [{ id: "embed", group: "media", rank: 40, label: "", icon: AppWindow, keywords: "iframe youtube vimeo loom figma gist map tweet codepen video", run: (c) => c.insert("embed", {}) }],
};
