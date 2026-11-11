import { Node, mergeAttributes } from "@tiptap/core";
import BookmarkView from "../nodes/BookmarkView.vue";
import { Bookmark as BookmarkIcon } from "@lucide/vue";
import { formatInfo } from "../core/info";
import type { EditorExtension } from "../types";
import { infoText, infoUrl, stringAttr } from "./fenceText";

export const BOOKMARK_FIELDS = ["url", "title", "description", "image", "icon", "site"] as const;
export type BookmarkAttrs = Record<(typeof BOOKMARK_FIELDS)[number], string>;

const URL_FIELDS: Record<string, true> = { url: true, image: true, icon: true };

export function siteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, stringAttr(f)]));
  },
  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as BookmarkAttrs;
    const text: unknown[] = ["span", { class: "wy-bookmark-text" }, ["span", { class: "wy-bookmark-title" }, a.title || a.url]];
    if (a.description) text.push(["span", { class: "wy-bookmark-desc" }, a.description]);
    text.push(["span", { class: "wy-bookmark-url" }, a.url]);
    const link: unknown[] = ["a", { href: a.url, target: "_blank", rel: "noopener noreferrer", class: "wy-bookmark-card" }, text];
    if (a.image) link.push(["img", { src: a.image, alt: "", class: "wy-bookmark-image", loading: "lazy" }]);
    return ["div", mergeAttributes({ "data-type": "bookmark", class: "wy-bookmark" }, HTMLAttributes), link] as never;
  },
});

export const bookmarkExtension: EditorExtension = {
  name: "bookmark",
  tiptap: [Bookmark],
  nodeViews: { bookmark: BookmarkView },
  markdown: {
    fences: [
      {
        kind: "bookmark",
        parse: (ctx) => {
          const a = ctx.info.attrs;
          // a bare address as the body is taken as the url
          const body = ctx.body.trim();
          ctx.atom("bookmark", { ...a, url: a.url ?? (/^\S+$/.test(body) ? body : "") });
        },
      },
    ],
    tokens: { bookmark: { node: "bookmark", getAttrs: (tok) => Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, String(tok.meta[f] ?? "")])) } },
    nodes: {
      bookmark(state, node, _parent, _index, h) {
        const attrs = Object.fromEntries(BOOKMARK_FIELDS.map((f) => [f, URL_FIELDS[f] ? infoUrl(node.attrs[f]) : infoText(node.attrs[f])]));
        h.writeFence(state, node, formatInfo("bookmark", attrs), "");
      },
    },
  },
  slash: [{ id: "bookmark", group: "media", rank: 30, label: "", icon: BookmarkIcon, keywords: "link preview card url", run: (c) => c.insert("bookmark", {}) }],
};
