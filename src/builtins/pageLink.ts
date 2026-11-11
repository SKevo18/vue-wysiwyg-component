import { Node, mergeAttributes } from "@tiptap/core";
import PageLinkView from "../nodes/PageLinkView.vue";
import { FileSymlink } from "@lucide/vue";
import { formatInfo } from "../core/info";
import type { EditorExtension } from "../types";
import { paletteAttribute } from "../schema/nodes";
import { openPageSearch } from "../editor/pageSearch";
import { infoText, infoUrl, stringAttr } from "./fenceText";
import { writeColorLine } from "./toc";

export const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return { href: stringAttr("href"), title: stringAttr("title"), icon: stringAttr("icon"), color: paletteAttribute() };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="page-link"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const { href, title, icon } = node.attrs as { href: string; title: string; icon: string };
    const link = ["a", { href, class: "wy-page-link-anchor" }, ["span", { class: "wy-page-link-icon", "aria-hidden": "true" }, icon || "📄"], ["span", { class: "wy-page-link-title" }, title || href]];
    return ["div", mergeAttributes({ "data-type": "page-link", class: "wy-page-link" }, HTMLAttributes), link];
  },
});

export const pageLinkExtension: EditorExtension = {
  name: "pageLink",
  tiptap: [PageLink],
  nodeViews: { pageLink: PageLinkView },
  markdown: {
    fences: [
      {
        kind: "page",
        parse: (ctx) => {
          const a = ctx.info.attrs;
          ctx.atom("page_link", { href: a.href ?? "", title: a.title ?? "", icon: a.icon ?? "" });
        },
      },
    ],
    tokens: { page_link: { node: "pageLink", getAttrs: (tok) => ({ href: tok.meta.href, title: tok.meta.title, icon: tok.meta.icon, color: tok.meta.blockAttrs?.color ?? null }) } },
    nodes: {
      pageLink(state, node, _parent, _index, h) {
        h.writeFence(state, node, formatInfo("page", { href: infoUrl(node.attrs.href), title: infoText(node.attrs.title), icon: infoText(node.attrs.icon).replace(/\s/g, "") }), "");
        writeColorLine(state, node);
      },
    },
  },
  slash: [
    {
      id: "pageLink",
      group: "blocks",
      rank: 45,
      label: "",
      icon: FileSymlink,
      keywords: "link to page subpage mention",
      enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.searchMentions,
      run: (c) => {
        const at = c.range?.from ?? c.editor.state.selection.from;
        c.clear();
        openPageSearch(c.editor, at);
      },
    },
  ],
};
