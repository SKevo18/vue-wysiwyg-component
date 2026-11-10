import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import { fragmentMarkdown, type MarkdownConverter } from "../markdown";
import { cellSlice, isInCell } from "./tables";

export function looksLikeMarkdown(text: string): boolean {
  return text.includes("\n") || /^(#|-|\*|>|```|\|)/.test(text) || /\*\*|==|\$|\[/.test(text);
}

const RICH_HTML = /<(h[1-6]|ul|ol|li|table|img|blockquote|strong|em|b|i|a|pre|code)[\s>]/i;

export function pasteAsMarkdown(text: string, html: string): boolean {
  if (!text.trim() || !looksLikeMarkdown(text)) return false;
  return !html || (!RICH_HTML.test(html) && !new DOMParser().parseFromString(html, "text/html").querySelector("[data-pm-slice]"));
}

export function clipboardText(slice: Slice, markdown: MarkdownConverter): string {
  const { content } = slice;
  const schema = content.firstChild?.type.schema;
  if (!schema) return "";
  let inline = true;
  content.forEach((n) => {
    if (!n.isInline) inline = false;
  });
  try {
    if (inline) return markdown.serializeInline(schema.topNodeType.create(null, schema.nodes.paragraph!.create(null, content)));
    return fragmentMarkdown(markdown, content, schema);
  } catch {
    return content.textBetween(0, content.size, "\n\n");
  }
}

const DROP = "style, script, meta, link, title, xml, head, noscript, iframe, object, embed, form, input:not([type=checkbox]), button, select, textarea, svg, canvas";
const KEEP_ATTRS: Record<string, string[]> = {
  A: ["href", "title", "data-type"],
  IMG: ["src", "alt", "title", "width", "data-align", "data-width"],
  TD: ["colspan", "rowspan"],
  TH: ["colspan", "rowspan"],
  OL: ["start", "data-list-style"],
  UL: ["data-type", "data-list-style", "data-marker"],
  LI: ["data-type", "data-checked"],
  DIV: ["data-type", "data-variant", "data-title", "data-callout", "data-math-block", "data-tex"],
  P: ["data-type", "data-align", "data-width"],
  FIGURE: ["data-type", "data-align", "data-width", "data-caption"],
  SPAN: ["data-color", "data-math-inline", "data-tex"],
  MARK: ["data-color"],
  PRE: ["data-meta"],
  CODE: ["class"],
  INPUT: ["type", "checked"],
  DETAILS: ["open", "data-title"],
};
const ALIGNABLE: Record<string, true> = { P: true, H1: true, H2: true, H3: true, H4: true, H5: true, H6: true, DIV: true, TD: true, TH: true };
const BLOCK = "p, div, h1, h2, h3, h4, h5, h6, ul, ol, li, table, blockquote, pre, hr, figure";

function wrapChildren(el: Element, tag: string) {
  const w = el.ownerDocument.createElement(tag);
  while (el.firstChild) w.appendChild(el.firstChild);
  el.appendChild(w);
}

function unwrap(el: Element) {
  el.replaceWith(...Array.from(el.childNodes));
}

/** keeps text alignment but drops every other style; the editor's own html (`data-pm-slice`) passes untouched */
export function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.querySelector("[data-pm-slice]")) return html;
  const body = doc.body;
  body.querySelectorAll(DROP).forEach((el) => el.remove());
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
  comments.forEach((n) => n.parentNode?.removeChild(n));

  for (const el of Array.from(body.querySelectorAll<HTMLElement>("*"))) {
    const tag = el.tagName;
    const s = el.style;
    const weight = s.fontWeight;
    const align = ALIGNABLE[tag] && ["center", "right", "justify"].includes(s.textAlign) ? s.textAlign : "";
    if ((tag === "B" || tag === "STRONG") && weight && (weight === "normal" || Number(weight) <= 400)) {
      unwrap(el);
      continue;
    }
    if (tag.includes(":")) {
      unwrap(el);
      continue;
    }
    if ((weight === "bold" || Number(weight) >= 600) && !/^(B|STRONG|H\d|TH)$/.test(tag)) wrapChildren(el, "strong");
    if (s.fontStyle === "italic" && tag !== "I" && tag !== "EM") wrapChildren(el, "em");
    if (s.textDecorationLine?.includes("underline") || s.textDecoration?.includes("underline")) {
      if (tag !== "U" && tag !== "A") wrapChildren(el, "u");
    }
    if (s.textDecorationLine?.includes("line-through") || s.textDecoration?.includes("line-through")) {
      if (tag !== "S" && tag !== "DEL") wrapChildren(el, "s");
    }
    const keep = KEEP_ATTRS[tag] ?? [];
    for (const a of Array.from(el.attributes)) if (!keep.includes(a.name)) el.removeAttribute(a.name);
    if (align) el.setAttribute("style", `text-align: ${align}`);
  }
  for (const el of Array.from(body.querySelectorAll("span, font"))) if (!el.attributes.length) unwrap(el);
  for (const el of Array.from(body.querySelectorAll("div:not([data-type]):not([data-callout]):not([data-math-block])"))) {
    if (el.querySelector(BLOCK)) continue;
    const p = doc.createElement("p");
    p.append(...Array.from(el.childNodes));
    if (el.getAttribute("style")) p.setAttribute("style", el.getAttribute("style")!);
    el.replaceWith(p);
  }
  for (const p of Array.from(body.querySelectorAll("p"))) {
    if (!p.textContent?.replace(/\u00a0/g, " ").trim() && !p.querySelector("img")) p.remove();
  }
  return body.innerHTML;
}

export function clipboardExtension(markdown: MarkdownConverter, copyMarkdown: boolean) {
  return Extension.create({
    name: "wysiwygClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("wysiwygClipboard"),
          props: {
            clipboardTextSerializer: copyMarkdown ? (slice: Slice) => clipboardText(slice, markdown) : undefined,
            transformPastedHTML: cleanPastedHtml,
            handlePaste(view, event) {
              const data = event.clipboardData;
              const text = data?.getData("text/plain") ?? "";
              if (!pasteAsMarkdown(text, data?.getData("text/html") ?? "")) return false;
              const { state } = view;
              if (state.selection.$from.parent.type.spec.code) return false;
              let slice: Slice;
              try {
                const inline = state.schema.topNodeType.spec.content === "paragraph";
                slice = inline ? Slice.maxOpen(markdown.parseInline(text, state.schema).content) : markdown.slice(text, state.schema);
              } catch {
                return false;
              }
              if (isInCell(state.selection.$from)) {
                if (slice.content.firstChild?.type.name === "table") return false;
                slice = cellSlice(slice, state);
              }
              view.dispatch(state.tr.replaceSelection(slice).setMeta("paste", true).setMeta("uiEvent", "paste").scrollIntoView());
              return true;
            },
          },
        }),
      ];
    },
  });
}
