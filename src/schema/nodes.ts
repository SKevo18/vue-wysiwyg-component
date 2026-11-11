import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { DOMParser, Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import CodeBlock from "@tiptap/extension-code-block";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import { TableCell, TableHeader } from "@tiptap/extension-table";
import { DEFAULT_DIVIDER, dividerOrnament, dividerStyle, listLook, parseDividerAttrs, parseListAttrs, type DividerAttrs, type ListAttrs } from "../core/attrs";
import { FIGURE_ALIGNS, SIZE_RE, shownAlign, type FigureAlign } from "../core/media";
import { isPaletteToken } from "../core/palette";

/** a palette token from `data-color`; html may carry other colors, which stay out of the palette attribute */
export function paletteAttribute() {
  return {
    default: null,
    parseHTML: (dom: HTMLElement) => {
      const v = dom.getAttribute("data-color");
      return isPaletteToken(v) ? v : null;
    },
    renderHTML: (a: { color?: string | null }) => (a.color ? { "data-color": a.color } : {}),
  };
}

function readAlign(dom: HTMLElement): FigureAlign | null {
  const a = dom.getAttribute("data-align");
  return a && (FIGURE_ALIGNS as readonly string[]).includes(a) ? (a as FigureAlign) : null;
}

function readWidth(dom: HTMLElement, img?: HTMLElement | null): number | null {
  const candidates = [dom.getAttribute("data-width"), img?.style.width, img?.getAttribute("width")];
  for (const c of candidates) {
    const m = c ? /^(\d+)(%?)$/.exec(c.trim()) : null;
    if (m && (m[2] || c === dom.getAttribute("data-width"))) {
      const n = parseInt(m[1]!, 10);
      if (n >= 10 && n <= 100) return n;
    }
  }
  return null;
}

function readPixels(img: HTMLElement | null | undefined): number | null {
  const w = img?.getAttribute("width") ?? "";
  return /^\d+$/.test(w) ? parseInt(w, 10) : null;
}

function imageLayoutAttributes() {
  return {
    width: { default: null, parseHTML: (dom: HTMLElement) => readWidth(dom, dom), renderHTML: (a: { width: number | null }) => (a.width ? { "data-width": String(a.width) } : {}) },
    align: { default: null, parseHTML: readAlign, renderHTML: (a: { align: FigureAlign | null }) => (a.align ? { "data-align": a.align } : {}) },
  };
}

export const InlineImage = Image.extend({
  draggable: false,
  addAttributes() {
    return { ...this.parent?.(), ...imageLayoutAttributes() };
  },
  renderHTML({ HTMLAttributes, node }) {
    const width = node.attrs.width as number | null;
    return ["img", mergeAttributes(HTMLAttributes, width ? { style: `width: ${width}%` } : {})];
  },
}).configure({ inline: true, allowBase64: false });

export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "", parseHTML: (dom: HTMLElement) => dom.querySelector("img")?.getAttribute("src") ?? "", renderHTML: () => ({}) },
      alt: { default: null, parseHTML: (dom: HTMLElement) => dom.querySelector("img")?.getAttribute("alt") || null, renderHTML: () => ({}) },
      caption: { default: null, parseHTML: (dom: HTMLElement) => dom.getAttribute("data-caption") || dom.querySelector("figcaption")?.textContent || null, renderHTML: () => ({}) },
      width: { default: null, parseHTML: (dom: HTMLElement) => readWidth(dom, dom.querySelector("img")), renderHTML: () => ({}) },
      align: {
        default: null,
        parseHTML: (dom: HTMLElement) => {
          const a = readAlign(dom) ?? (dom.querySelector("img") ? readAlign(dom.querySelector("img")!) : null);
          if (a) return a;
          const t = dom.style.textAlign;
          return t === "center" || t === "right" ? t : null;
        },
        renderHTML: () => ({}),
      },
      /** pixel width from pasted html; replaced by `width` once resized */
      pixels: { default: null, parseHTML: (dom: HTMLElement) => (readWidth(dom, dom.querySelector("img")) ? null : readPixels(dom.querySelector("img"))), renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    const hasImg = (dom: HTMLElement) => (dom.querySelector("img")?.getAttribute("src") ? null : false);
    return [
      { tag: 'p[data-type="image"]', priority: 60, getAttrs: hasImg },
      { tag: "figure", getAttrs: hasImg },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const { src, alt, caption, width, align, pixels } = node.attrs as { src: string; alt: string | null; caption: string | null; width: number | null; align: FigureAlign | null; pixels: number | null };
    const shown = shownAlign(align, caption);
    const img = ["img", { src, alt: alt ?? "", width: pixels ? String(pixels) : null, style: width ? `width: ${width}%` : null, "data-align": align }] as const;
    const attrs = mergeAttributes({ "data-type": "image", "data-align": align, "data-width": width ? String(width) : null, class: `wy-figure wy-align-${shown}` }, HTMLAttributes);
    if (caption) return ["figure", mergeAttributes(attrs, { "data-caption": caption }), img, ["figcaption", {}, caption]];
    const textAlign = shown === "center" || shown === "right" ? `text-align: ${shown}` : null;
    return ["p", mergeAttributes(attrs, { style: textAlign }), img];
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: false,
  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (dom: HTMLElement) => (dom.hasAttribute("data-callout") ? dom.getAttribute("data-type") : dom.getAttribute("data-variant")) || "note",
        renderHTML: () => ({}),
      },
      title: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-title") || "", renderHTML: (a: { title: string }) => (a.title ? { "data-title": a.title } : {}) },
      icon: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-icon") || "", renderHTML: (a: { icon: string }) => (a.icon ? { "data-icon": a.icon } : {}) },
      color: paletteAttribute(),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }, { tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes({ "data-type": "callout", "data-variant": node.attrs.type, class: "wy-callout" }, HTMLAttributes), 0];
  },
});

export const Divider = HorizontalRule.extend({
  draggable: false,
  addAttributes() {
    const attr = (name: keyof DividerAttrs) => ({
      default: DEFAULT_DIVIDER[name],
      parseHTML: (dom: HTMLElement) => {
        const v = dom.getAttribute(`data-${name}`);
        return (v ? parseDividerAttrs({ [name]: v })?.[name] : undefined) ?? DEFAULT_DIVIDER[name];
      },
      renderHTML: (a: Record<string, unknown>) => (a[name] !== DEFAULT_DIVIDER[name] ? { [`data-${name}`]: String(a[name]) } : {}),
    });
    return { width: attr("width"), color: attr("color"), style: attr("style"), design: attr("design"), char: attr("char") };
  },
  parseHTML() {
    return [{ tag: "hr" }, { tag: "div.wy-divider" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs as DividerAttrs;
    const style = dividerStyle(attrs) || null;
    const ornament = dividerOrnament(attrs);
    if (!ornament) return ["hr", mergeAttributes({ class: "wy-divider", style }, HTMLAttributes)];
    return ["div", mergeAttributes({ class: "wy-divider has-ornament", role: "separator", style }, HTMLAttributes), ["span", { class: "wy-divider-ornament", "aria-hidden": "true" }, ornament]];
  },
});

export const ListStyles = Extension.create({
  name: "listStyles",
  addGlobalAttributes() {
    return [
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          listStyle: {
            default: null,
            parseHTML: (dom: HTMLElement) => parseListAttrs({ style: dom.getAttribute("data-list-style") ?? "" }, dom.tagName === "OL" ? "ordered" : "bullet")?.style ?? null,
            renderHTML: (a: Record<string, unknown>) => {
              const look = listLook({ style: a.listStyle as ListAttrs["style"], marker: a.marker as string | null });
              return { ...(a.listStyle ? { "data-list-style": a.listStyle } : {}), ...(look.class ? { class: look.class } : {}), ...(look.style ? { style: look.style } : {}) };
            },
          },
          marker: { default: null, parseHTML: (dom: HTMLElement) => parseListAttrs({ marker: dom.getAttribute("data-marker") ?? "" }, "bullet")?.marker ?? null, renderHTML: (a: Record<string, unknown>) => (a.marker ? { "data-marker": a.marker } : {}) },
        },
      },
    ];
  },
});

export const FileChips = Extension.create({
  name: "fileChips",
  addGlobalAttributes() {
    return [
      {
        types: ["link"],
        attributes: {
          fileChip: {
            default: null,
            parseHTML: () => null,
            renderHTML: (a: Record<string, unknown>) => (typeof a.title === "string" && SIZE_RE.test(a.title) ? { "data-file-size": a.title, download: "" } : {}),
          },
        },
      },
    ];
  },
});

export const GenericCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      meta: { default: "", parseHTML: (el: HTMLElement) => el.getAttribute("data-meta") ?? "", renderHTML: (a: { meta: string }) => (a.meta ? { "data-meta": a.meta } : {}) },
    };
  },
}).configure({ defaultLanguage: null });

export function flattenToParagraph(content: Fragment, schema: Schema): PMNode {
  const br = schema.nodes.hardBreak!;
  const out: PMNode[] = [];
  const push = (nodes: PMNode[]) => {
    if (nodes.length === 0) return;
    if (out.length) out.push(br.create());
    out.push(...nodes);
  };
  const lines = (text: string) => text.split("\n").flatMap((line, i) => [...(i ? [br.create()] : []), ...(line ? [schema.text(line)] : [])]);
  const walk = (frag: Fragment) => {
    let inline: PMNode[] = [];
    frag.forEach((node) => {
      if (node.isInline) {
        inline.push(node);
        return;
      }
      push(inline);
      inline = [];
      const { attrs } = node;
      if (node.isTextblock) push(node.type.spec.code ? lines(node.textContent) : node.content.content.slice());
      else if (node.type.name === "figure" && schema.nodes.image) push([schema.nodes.image.create({ src: attrs.src, alt: attrs.alt, title: attrs.caption, width: attrs.width })]);
      else if (node.type.name === "mathBlock" && schema.nodes.mathInline) push([schema.nodes.mathInline.create({ tex: attrs.tex })]);
      else if (node.isLeaf) push(lines(String(attrs.body ?? node.textContent)));
      else {
        if (typeof attrs.title === "string" && attrs.title.trim()) push(lines(attrs.title.trim()));
        walk(node.content);
      }
    });
    push(inline);
  };
  walk(content);
  return schema.nodes.paragraph!.create(null, out);
}

function inlineCell<T extends typeof TableCell | typeof TableHeader>(cell: T, tag: string): T {
  return cell.extend({
    content: "paragraph",
    parseHTML() {
      return [{ tag, getContent: (dom: globalThis.Node, schema: Schema) => Fragment.from(flattenToParagraph(DOMParser.fromSchema(schema).parseSlice(dom).content, schema)) }];
    },
  }) as T;
}

export const InlineTableCell = inlineCell(TableCell, "td");
export const InlineTableHeader = inlineCell(TableHeader, "th");

export const InlineDocument = Node.create({ name: "doc", topNode: true, content: "paragraph" });
