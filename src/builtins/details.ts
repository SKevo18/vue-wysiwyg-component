import { Node, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { ChevronsDownUp, Heading1, Heading2, Heading3 } from "@lucide/vue";
import { formatInfo } from "../core/info";
import type { ConvertContext, EditorExtension, SlashItemDef } from "../types";

/** toggle headings are details with a level; 0 is a plain toggle */
export const TOGGLE_LEVELS = [1, 2, 3, 4] as const;

function headingLevel(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 0;
}

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
      heading: {
        default: 0,
        parseHTML: (dom: HTMLElement) => headingLevel(dom.getAttribute("data-heading") ?? dom.querySelector(":scope > summary > :is(h1, h2, h3, h4)")?.tagName.slice(1)),
        renderHTML: (a: { heading: number }) => (a.heading ? { "data-heading": String(a.heading) } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "details", contentElement: (dom: HTMLElement) => dom.querySelector<HTMLElement>(":scope > [data-details-body]") ?? dom }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const title = node.attrs.title || "";
    const level = headingLevel(node.attrs.heading);
    const summary = level ? ["summary", {}, [`h${level}`, {}, title]] : ["summary", {}, title];
    return ["details", mergeAttributes({ "data-type": "details", "data-title": title || null, class: "wy-details" }, HTMLAttributes), summary, ["div", { "data-details-body": "" }, 0]];
  },
});

function toggleHeading(level: number) {
  return (blocks: readonly PMNode[], ctx: ConvertContext): PMNode[] | null => {
    const details = ctx.schema.nodes.details!;
    const b = blocks.length === 1 ? blocks[0]! : null;
    if (b?.type === details) return [details.create({ ...b.attrs, heading: level }, b.content)];
    if (!level) return null;
    if (b && (b.type.name === "paragraph" || b.type.name === "heading")) {
      return [details.create({ title: ctx.plainText(b.content).replace(/\n/g, " ").trim(), open: true, heading: level }, ctx.schema.nodes.paragraph!.create())];
    }
    const wrapped = ctx.wrap(blocks, "details", `toggleHeading${level}`);
    return wrapped?.map((n) => (n.type === details ? details.create({ ...n.attrs, heading: level }, n.content) : n)) ?? null;
  };
}

const HEADING_ICONS = [Heading1, Heading2, Heading3];

export const detailsExtension: EditorExtension = {
  name: "details",
  tiptap: [Details],
  markdown: {
    fences: [{ kind: "details", parse: (ctx) => ctx.container("details", { title: ctx.info.attrs.title ?? "", open: ctx.info.attrs.open === "true", heading: headingLevel(ctx.info.attrs.heading) }) }],
    tokens: { details: { block: "details", getAttrs: (tok) => ({ title: tok.meta.title, open: !!tok.meta.open, heading: tok.meta.heading ?? 0 }) } },
    nodes: {
      details(state, node, _parent, _index, h) {
        const level = headingLevel(node.attrs.heading);
        const info = formatInfo("details", { title: String(node.attrs.title ?? "").trim(), heading: level ? String(level) : "", open: node.attrs.open ? "true" : "" });
        h.writeFence(state, node, info, h.contentMarkdown(node));
      },
    },
  },
  slash: [
    { id: "details", group: "text", rank: 40, label: "", icon: ChevronsDownUp, run: (c) => c.insert("details", { title: "", open: false }, [{ type: "paragraph" }]) },
    ...HEADING_ICONS.map(
      (icon, i): SlashItemDef => ({
        id: `toggleHeading${i + 1}`,
        group: "text",
        rank: 41 + i,
        label: "",
        icon,
        keywords: "toggle collapsible details",
        run: (c) => c.insert("details", { title: "", open: true, heading: i + 1 }, [{ type: "paragraph" }]),
      }),
    ),
  ],
  convert: {
    containers: {
      details: {
        title: (node) => String(node.attrs.title ?? "").trim(),
        build: ({ title, content }, ctx, target) => ctx.schema.nodes.details!.create({ title, open: false, heading: headingLevel(/^toggleHeading(\d)$/.exec(target)?.[1]) }, content),
      },
    },
    targets: [
      { id: "details", label: "", icon: ChevronsDownUp, rank: 32, container: "details" },
      // a toggle heading back to a plain toggle; the container above wraps everything else
      { id: "details", label: "", convert: toggleHeading(0) },
      ...HEADING_ICONS.map((icon, i) => ({ id: `toggleHeading${i + 1}`, label: "", icon, rank: 33 + i * 0.1, convert: toggleHeading(i + 1) })),
    ],
  },
};
