import { Node, mergeAttributes } from "@tiptap/core";
import type { StateBlock, StateInline } from "markdown-it";
import type { EditorExtension } from "../types";

const label = { default: "1", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-label") || "1", renderHTML: (a: { label: string }) => ({ "data-label": a.label }) };

export const FootnoteRef = Node.create({
  name: "footnoteRef",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return { label };
  },
  parseHTML() {
    return [{ tag: "sup[data-footnote-ref]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["sup", mergeAttributes({ "data-footnote-ref": "", class: "wy-footnote-ref" }, HTMLAttributes), `[^${node.attrs.label}]`];
  },
});

export const FootnoteDef = Node.create({
  name: "footnoteDef",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  addAttributes() {
    return { label };
  },
  parseHTML() {
    return [{ tag: "div[data-footnote-def]", preserveWhitespace: "full" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-footnote-def": "", class: "wy-footnote-def" }, HTMLAttributes), 0];
  },
});

/** continuation lines run until a blank line (indentation stripped). */
function footnoteDefRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine]! + state.tShift[startLine]!;
  const max = state.eMarks[startLine]!;
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  const m = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/.exec(state.src.slice(start, max));
  if (!m) return false;
  if (silent) return true;
  const lines = [m[2]!];
  let next = startLine + 1;
  for (; next < endLine; next++) {
    if (state.isEmpty(next)) break;
    const s = state.bMarks[next]! + state.tShift[next]!;
    const e = state.eMarks[next]!;
    if (state.sCount[next]! - state.blkIndent < 2 && /^\[\^[^\]\s]+\]:/.test(state.src.slice(s, e))) break;
    lines.push(state.src.slice(s, e).trim());
  }
  state.line = next;
  const token = state.push("footnote_def", "div", 0);
  token.block = true;
  token.meta = { label: m[1] };
  token.content = lines.join("\n").trim();
  token.map = [startLine, next];
  return true;
}

function footnoteRefRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  if (src.charCodeAt(state.pos) !== 0x5b || src.charCodeAt(state.pos + 1) !== 0x5e) return false;
  const close = src.indexOf("]", state.pos + 2);
  if (close < 0 || close >= state.posMax) return false;
  const name = src.slice(state.pos + 2, close);
  if (!name || /\s/.test(name)) return false;
  if (!silent) state.push("footnote_ref", "sup", 0).meta = { label: name };
  state.pos = close + 1;
  return true;
}

export const footnotesExtension: EditorExtension = {
  name: "footnotes",
  formats: ["markdown"],
  tiptap: [FootnoteRef, FootnoteDef],
  markdown: {
    plugins: [
      (md) => {
        md.block.ruler.before("reference", "pm_footnote_def", footnoteDefRule, { alt: ["paragraph", "reference"] });
        md.inline.ruler.after("image", "pm_footnote_ref", footnoteRefRule);
      },
    ],
    tokens: {
      footnote_ref: { node: "footnoteRef", getAttrs: (tok) => ({ label: tok.meta.label }) },
      footnote_def: { block: "footnoteDef", noCloseToken: true, getAttrs: (tok) => ({ label: tok.meta.label }) },
    },
    nodes: {
      footnoteRef(state, node) {
        state.write(`[^${node.attrs.label}]`);
      },
      footnoteDef(state, node) {
        state.write(`[^${node.attrs.label}]: `);
        state.text(node.textContent.split("\n").join("\n    "), false);
        state.closeBlock(node);
      },
    },
  },
};
