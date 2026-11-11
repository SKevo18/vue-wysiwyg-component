// Markdown documents colour with palette tokens only (core/colors.ts); html documents keep tiptap's own Color and
// multicolour Highlight, which store any CSS colour.
import { Extension } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { blockColorStyle, isBgToken, isColorToken, isTextToken, tokenCss, tokenFromCss } from "../core/colors";

// above Link (1000): a colour mark must wrap a link, `[[label](/p/1)]{color=red}`, since markdown-it reads no
// bracketed span inside a link label. text colour wraps background colour, so a partly highlighted run stays one span
const OUTSIDE_LINKS = 1100;

/** node types that take a block colour; types missing from the schema are ignored */
export const BLOCK_COLOR_TYPES = ["paragraph", "heading", "listItem", "taskItem", "blockquote", "callout", "details", "tableCell", "tableHeader", "pageLink"];

function textToken(el: HTMLElement): string | null {
  const data = el.getAttribute("data-color");
  if (isTextToken(data)) return data;
  const css = tokenFromCss(el.style.getPropertyValue("color"));
  return isTextToken(css) ? css : null;
}

export const PaletteTextStyle = TextStyle.extend({
  priority: OUTSIDE_LINKS + 1,
  parseHTML() {
    return [{ tag: "span", consuming: false, getAttrs: (el: HTMLElement) => (textToken(el) ? {} : false) }];
  },
});

export const PaletteColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          color: {
            default: null,
            parseHTML: textToken,
            renderHTML: (a: Record<string, unknown>) => (isTextToken(a.color) ? { "data-color": a.color, style: `color: ${tokenCss(a.color)}` } : {}),
          },
        },
      },
    ];
  },
});

export const PaletteHighlight = Highlight.extend({
  priority: OUTSIDE_LINKS,
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const data = el.getAttribute("data-color");
          if (isBgToken(data)) return data;
          const css = tokenFromCss(el.style.getPropertyValue("background-color"));
          return isBgToken(css) ? css : null;
        },
        renderHTML: (a: Record<string, unknown>) => (isBgToken(a.color) ? { "data-color": a.color, style: `background-color: ${tokenCss(a.color)}` } : {}),
      },
    };
  },
});

export const BlockColor = Extension.create({
  name: "blockColor",
  addGlobalAttributes() {
    return [
      {
        types: BLOCK_COLOR_TYPES,
        attributes: {
          color: {
            default: null,
            parseHTML: (el: HTMLElement) => {
              const v = el.getAttribute("data-block-color");
              return isColorToken(v) ? v : null;
            },
            renderHTML: (a: Record<string, unknown>) => {
              const style = blockColorStyle(a.color);
              return style ? { "data-block-color": a.color, style } : {};
            },
          },
        },
      },
    ];
  },
});
