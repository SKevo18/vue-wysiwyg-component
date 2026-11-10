import { Node, mergeAttributes } from "@tiptap/core";
import { ChevronsDownUp } from "@lucide/vue";
import { formatInfo } from "../core/info";
import type { EditorExtension } from "../types";

export const Details = Node.create({
  name: "details",
  group: "block",
  content: "block+",
  defining: true,
  draggable: false,
  addAttributes() {
    return {
      title: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-title") || dom.querySelector(":scope > summary")?.textContent || "", renderHTML: () => ({}) },
      open: { default: false, parseHTML: (dom: HTMLElement) => dom.hasAttribute("open"), renderHTML: (a: { open: boolean }) => (a.open ? { open: "" } : {}) },
    };
  },
  parseHTML() {
    return [{ tag: "details", contentElement: (dom: HTMLElement) => dom.querySelector<HTMLElement>(":scope > [data-details-body]") ?? dom }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["details", mergeAttributes({ "data-type": "details", "data-title": node.attrs.title || null, class: "wy-details" }, HTMLAttributes), ["summary", {}, node.attrs.title || ""], ["div", { "data-details-body": "" }, 0]];
  },
});

export const detailsExtension: EditorExtension = {
  name: "details",
  tiptap: [Details],
  markdown: {
    fences: [{ kind: "details", parse: (ctx) => ctx.container("details", { title: ctx.info.attrs.title ?? "", open: ctx.info.attrs.open === "true" }) }],
    tokens: { details: { block: "details", getAttrs: (tok) => ({ title: tok.meta.title, open: !!tok.meta.open }) } },
    nodes: {
      details(state, node, _parent, _index, h) {
        const info = formatInfo("details", { title: String(node.attrs.title ?? "").trim(), open: node.attrs.open ? "true" : "" });
        h.writeFence(state, node, info, h.contentMarkdown(node));
      },
    },
  },
  slash: [{ id: "details", group: "text", rank: 40, label: "", icon: ChevronsDownUp, run: (c) => c.insert("details", { title: "", open: false }, [{ type: "paragraph" }]) }],
  convert: {
    containers: {
      details: {
        title: (node) => String(node.attrs.title ?? "").trim(),
        build: ({ title, content }, ctx) => ctx.schema.nodes.details!.create({ title, open: false }, content),
      },
    },
    targets: [{ id: "details", label: "", icon: ChevronsDownUp, rank: 32, container: "details" }],
  },
};
