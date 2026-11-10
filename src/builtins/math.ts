import { Node, mergeAttributes } from "@tiptap/core";
import type { StateBlock, StateInline } from "markdown-it";
import { Sigma, SquareFunction } from "@lucide/vue";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorExtension } from "../types";

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return { tex: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-tex") || "", renderHTML: (a: { tex: string }) => ({ "data-tex": a.tex }) } };
  },
  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes({ "data-math-inline": "" }, HTMLAttributes), `$${node.attrs.tex}$`];
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: false,
  addAttributes() {
    return {
      tex: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-tex") || "", renderHTML: (a: { tex: string }) => ({ "data-tex": a.tex }) },
      /** the source used a ```math fence instead of `$$`; kept on round trip. */
      fence: { default: false, parseHTML: (dom: HTMLElement) => dom.hasAttribute("data-fence"), renderHTML: (a: { fence: boolean }) => (a.fence ? { "data-fence": "" } : {}) },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes({ "data-math-block": "" }, HTMLAttributes), `$$${node.attrs.tex}$$`];
  },
});

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  if (src.charCodeAt(state.pos) !== 0x24) return false;
  if (src.charCodeAt(state.pos + 1) === 0x24) return false;
  const start = state.pos + 1;
  if (start >= state.posMax || src[start] === " ") return false;
  let end = start;
  while (end < state.posMax) {
    end = src.indexOf("$", end);
    if (end < 0 || end >= state.posMax) return false;
    if (src[end - 1] !== "\\" && src[end - 1] !== " ") break;
    end++;
  }
  if (end < 0 || end >= state.posMax + 1 || end === start) return false;
  const next = src.charCodeAt(end + 1);
  if (next >= 0x30 && next <= 0x39) return false;
  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = src.slice(start, end);
  }
  state.pos = end + 1;
  return true;
}

function mathBlockRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine]! + state.tShift[startLine]!;
  const max = state.eMarks[startLine]!;
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  if (state.src.slice(start, start + 2) !== "$$") return false;
  const firstLine = state.src.slice(start + 2, max);
  if (silent) return true;
  let nextLine = startLine;
  let content: string;
  if (firstLine.trim().endsWith("$$")) {
    content = firstLine.trim().slice(0, -2);
  } else {
    content = firstLine;
    let found = false;
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
      const line = state.src.slice(state.bMarks[nextLine]! + state.tShift[nextLine]!, state.eMarks[nextLine]!);
      if (line.trim().endsWith("$$")) {
        content += "\n" + line.trim().slice(0, -2);
        found = true;
        break;
      }
      content += "\n" + line;
    }
    if (!found) return false;
  }
  state.line = nextLine + 1;
  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.map = [startLine, state.line];
  return true;
}

function soleFormula(b: PMNode): PMNode | null {
  if (b.type.name !== "paragraph") return null;
  const maths: PMNode[] = [];
  let other = false;
  b.forEach((c) => {
    if (c.type.name === "mathInline") maths.push(c);
    else if (!c.isText || c.text!.trim()) other = true;
  });
  return !other && maths.length === 1 ? maths[0]! : null;
}

export const mathExtension: EditorExtension = {
  name: "math",
  tiptap: [MathInline, MathBlock],
  markdown: {
    plugins: [
      (md) => {
        md.inline.ruler.after("escape", "math_inline", mathInlineRule);
        md.block.ruler.before("fence", "math_block", mathBlockRule, { alt: ["paragraph", "reference", "blockquote", "list"] });
      },
    ],
    fences: [{ kind: "math", parse: (ctx) => ctx.atom("math_fence", {}) }],
    tokens: {
      math_inline: { node: "mathInline", getAttrs: (tok) => ({ tex: tok.content }) },
      math_block: { node: "mathBlock", getAttrs: (tok) => ({ tex: tok.content, fence: false }) },
      math_fence: { node: "mathBlock", getAttrs: (tok) => ({ tex: tok.content.replace(/\n$/, "").trim(), fence: true }) },
    },
    nodes: {
      mathInline(state, node) {
        state.write(`$${String(node.attrs.tex).trim()}$`);
      },
      mathBlock(state, node, _parent, _index, h) {
        const tex = String(node.attrs.tex).trim();
        if (node.attrs.fence) {
          h.writeFence(state, node, "math", tex);
          return;
        }
        state.write("$$\n");
        state.text(tex, false);
        state.write("\n$$");
        state.closeBlock(node);
      },
    },
    escape: "\\$",
  },
  slash: [
    { id: "mathBlock", group: "blocks", rank: 20, label: "", icon: Sigma, run: (c) => c.insert("mathBlock", { tex: "", fence: false }) },
    { id: "mathInline", group: "blocks", rank: 30, label: "", icon: SquareFunction, inline: true, run: (c) => c.insert("mathInline", { tex: "" }) },
  ],
  convert: {
    convertible: ["mathBlock"],
    wrappable: ["mathBlock"],
    paragraphs: {
      mathBlock: (b, ctx) => {
        const tex = String(b.attrs.tex ?? "").trim();
        return [ctx.schema.nodes.paragraph!.create(null, tex ? ctx.schema.nodes.mathInline!.create({ tex }) : null)];
      },
    },
    targets: [
      {
        id: "mathBlock",
        label: "",
        icon: Sigma,
        rank: 64,
        convert: (blocks, ctx) => {
          const math = blocks.length === 1 ? soleFormula(blocks[0]!) : null;
          return math ? [ctx.schema.nodes.mathBlock!.create({ tex: math.attrs.tex, fence: false })] : null;
        },
      },
    ],
  },
};
