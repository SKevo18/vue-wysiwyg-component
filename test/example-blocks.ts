import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { StateInline } from "markdown-it";
import { Fragment } from "@tiptap/pm/model";
import { blockBody, defineEditorExtension, defineFenceBlock, fenceClose, fenceOpen, formatInfo, newBlockId, parseInfo, type ConvertContext, type ConvertItem, type EditorExtension } from "../src/index";

function section(name: string) {
  return Node.create({
    name,
    content: "block+",
    defining: true,
    isolating: true,
    addAttributes: () => ({ label: { default: "" } }),
    parseHTML: () => [{ tag: `div[data-${name}]` }],
    renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ [`data-${name}`]: "" }, HTMLAttributes), 0],
  });
}

const Tabs = Node.create({
  name: "tabs",
  group: "block",
  content: "tab+",
  defining: true,
  parseHTML: () => [{ tag: "div[data-tabs]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-tabs": "" }, HTMLAttributes), 0],
});

const Steps = Node.create({
  name: "steps",
  group: "block",
  content: "step+",
  defining: true,
  addAttributes: () => ({ title: { default: "" }, animated: { default: false } }),
  parseHTML: () => [{ tag: "div[data-steps]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-steps": "" }, HTMLAttributes), 0],
});

export const panes = defineEditorExtension({
  name: "panes",
  formats: ["markdown"],
  tiptap: [Tabs, section("tab"), Steps, section("step")],
  markdown: {
    fences: [
      { kind: "tabs", parse: (c) => c.sections("tabs", "tab", {}) },
      { kind: "steps", parse: (c) => c.sections("steps", "step", { title: c.info.attrs.title ?? "", animated: c.info.attrs.animated === "true" }) },
    ],
    tokens: {
      tabs: { block: "tabs" },
      tab: { block: "tab", getAttrs: (tok) => ({ label: tok.meta.label }) },
      steps: { block: "steps", getAttrs: (tok) => ({ title: tok.meta.title, animated: tok.meta.animated }) },
      step: { block: "step", getAttrs: (tok) => ({ label: tok.meta.label }) },
    },
    nodes: {
      tabs: (state, node, _p, _i, h) => h.writeFence(state, node, "tabs", h.sectionsMarkdown(node)),
      steps: (state, node, _p, _i, h) => h.writeFence(state, node, formatInfo("steps", { title: String(node.attrs.title ?? "").trim(), animated: node.attrs.animated ? "true" : "" }), h.sectionsMarkdown(node)),
      tab() {},
      step() {},
    },
  },
  slashGroups: [{ id: "activities", label: "Activities", rank: 50 }],
  slash: [
    { id: "tabs", group: "blocks", rank: 50, label: "Tabs", run: (c) => c.insertSections("tabs", "tab") },
    { id: "steps", group: "blocks", rank: 60, label: "Steps", run: (c) => c.insertSections("steps", "step") },
  ],
  convert: {
    sections: { tabs: "tab", steps: "step" },
    targets: [
      { id: "tabs", label: "Tabs", rank: 40, container: "tabs" },
      { id: "steps", label: "Steps", rank: 41, container: "steps" },
    ],
  },
});

const DefinitionBlock = Node.create({
  name: "definitionBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ number: { default: true }, inline: { default: false }, term: { default: "" } }),
  parseHTML: () => [{ tag: "[data-definition]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes({ "data-definition": "" }, HTMLAttributes), 0],
});

export const definitions = defineEditorExtension({
  name: "definitions",
  tiptap: [DefinitionBlock],
  markdown: {
    fences: [
      {
        kind: "definition",
        parse: (c) => c.container("definition", { number: c.info.attrs.number !== "false", inline: c.info.attrs.inline === "true", term: c.info.attrs.term ?? "" }),
      },
    ],
    tokens: { definition: { block: "definitionBlock", getAttrs: (tok) => ({ number: tok.meta.number !== false, inline: !!tok.meta.inline, term: tok.meta.term ?? "" }) } },
    nodes: {
      definitionBlock(state, node, _p, _i, h) {
        const info = formatInfo("definition", { term: String(node.attrs.term ?? "").trim(), number: node.attrs.number ? "" : "false", inline: node.attrs.inline ? "true" : "" });
        h.writeFence(state, node, info, h.contentMarkdown(node));
      },
    },
  },
  slash: [{ id: "definition", group: "blocks", rank: 40, label: "Definition", run: (c) => c.insert("definitionBlock", { number: true, inline: false, term: "" }, [{ type: "paragraph" }]) }],
  convert: {
    containers: {
      definitionBlock: {
        title: (node) => String(node.attrs.term ?? "").trim(),
        build: ({ title, content }, ctx, target) => ctx.schema.nodes.definitionBlock!.create({ term: ctx.plainText(ctx.parseInline(title)), inline: target === "definitionInline", number: true }, content),
      },
    },
    targets: [
      { id: "definition", label: "Definition", rank: 33, container: "definitionBlock" },
      { id: "definitionInline", label: "Definition in text", rank: 34, container: "definitionBlock" },
    ],
  },
});

interface Card {
  front: string;
  back: string;
}

function parseCards(body: string): Card[] {
  const cards: Card[] = [];
  let front: string[] = [];
  let back: string[] | null = null;
  let fence: string | null = null;
  const flush = () => {
    const f = blockBody(front.join("\n"));
    const b = blockBody((back ?? []).join("\n"));
    const m = back === null && front.length ? /^(.*?)\s::\s(.*)$/s.exec(f) : null;
    if (m && !f.includes("\n")) cards.push({ front: m[1]!.trim(), back: m[2]!.trim() });
    else if (f.trim() || b.trim()) cards.push({ front: f, back: b });
    front = [];
    back = null;
  };
  for (const line of body.split("\n")) {
    if (fence) {
      if (fenceClose(line, fence)) fence = null;
    } else if (fenceOpen(line)) {
      fence = fenceOpen(line)!.marker;
    } else if (/^-{3,}\s*$/.test(line)) {
      flush();
      continue;
    } else if (/^={3,}\s*$/.test(line) && back === null) {
      back = [];
      continue;
    }
    (back ?? front).push(line);
  }
  flush();
  return cards;
}

function serializeCards(cards: Card[]): string {
  return cards.map((c) => (!c.front.includes("\n") && !c.back.includes("\n") && c.front && c.back ? `${c.front} :: ${c.back}` : `${c.front}\n===\n${c.back}`)).join("\n---\n");
}

function cardItems(node: PMNode, ctx: ConvertContext): ConvertItem[] {
  const s = ctx.schema;
  return parseCards(String(node.attrs.body ?? "")).map((card) => {
    const front = ctx.parse(card.front);
    const back = ctx.parse(card.back);
    if (front.length === 1 && front[0]!.type.name === "paragraph" && back.length === 1 && back[0]!.type.name === "paragraph") {
      return { label: front[0]!.content.append(Fragment.from(s.text(" :: "))).append(back[0]!.content), body: [], checked: false };
    }
    const labelled = front.length > 0 && front[0]!.type.name === "paragraph";
    return { label: labelled ? front[0]!.content : Fragment.empty, body: [...front.slice(labelled ? 1 : 0), ...back], checked: false };
  });
}

function toCards(blocks: readonly PMNode[], ctx: ConvertContext): PMNode[] | null {
  const b = blocks.length === 1 ? blocks[0]! : null;
  const isList = b && ["bulletList", "orderedList", "taskList"].includes(b.type.name);
  const items = isList || blocks.every((x) => x.type.name === "paragraph" || x.type.name === "heading") ? ctx.items(blocks) : null;
  if (!items?.length) return null;
  const cards: Card[] = [];
  for (const it of items) {
    if (it.body.length) {
      if (!it.label.size) return null;
      cards.push({ front: ctx.inlineMarkdown(it.label), back: ctx.serialize(it.body).trim() });
      continue;
    }
    const text = ctx.inlineMarkdown(it.label);
    const at = text.indexOf(" :: ");
    if (at < 0) return null;
    cards.push({ front: text.slice(0, at), back: text.slice(at + 4) });
  }
  return [ctx.schema.nodes.flashcardsBlock!.create({ attrs: {}, body: serializeCards(cards) })];
}

export const flashcards = defineFenceBlock({
  kind: "flashcards",
  slash: { group: "activities", rank: 40, label: "Flashcards" },
  convert: {
    convertible: ["flashcardsBlock"],
    items: { flashcardsBlock: cardItems },
    paragraphs: { flashcardsBlock: (node, ctx) => ctx.itemParagraphs(cardItems(node, ctx)) },
    targets: [{ id: "flashcards", label: "Flashcards", rank: 70, convert: toCards }],
  },
});

export const mermaid = defineFenceBlock({
  kind: "mermaid",
  match: (info) => info.attrs.run !== "true",
  convert: {
    convertible: ["mermaidBlock"],
    targets: [
      {
        id: "mermaid",
        label: "Diagram",
        rank: 63,
        convert: (blocks, ctx) => {
          const b = blocks.length === 1 ? blocks[0]! : null;
          if (!b || b.type.name !== "codeBlock" || String(b.attrs.language ?? "").toLowerCase() !== "mermaid") return null;
          return [ctx.schema.nodes.mermaidBlock!.create({ attrs: {}, body: b.textContent })];
        },
      },
      {
        id: "codeBlock",
        label: "",
        convert: (blocks, ctx) => {
          const b = blocks.length === 1 ? blocks[0]! : null;
          if (!b || b.type.name !== "mermaidBlock") return null;
          const body = String(b.attrs.body ?? "");
          return [ctx.schema.nodes.codeBlock!.create({ language: "mermaid" }, body ? ctx.schema.text(body) : null)];
        },
      },
    ],
  },
});

const RUNTIMES = ["python", "py", "javascript", "js", "sql", "lua", "c", "cpp", "go", "php", "ruby", "html"];

function codeInfo(attrs: Record<string, unknown>): string {
  const language = String(attrs.language ?? "");
  if (!language) return "";
  if (language.toLowerCase() === "mermaid") return "mermaid run";
  if (!attrs.run) return language;
  return formatInfo(language, {
    run: "true",
    ...(attrs.packages ? { packages: String(attrs.packages) } : {}),
    ...(attrs.hideCode ? { "hide-code": "true" } : {}),
    ...(attrs.autorun ? { autorun: "true" } : {}),
    ...(attrs.title ? { title: String(attrs.title) } : {}),
    ...(attrs.height ? { height: String(attrs.height) } : {}),
  });
}

export const runnable = defineEditorExtension({
  name: "runnable",
  formats: ["markdown"],
  tiptap: [
    Extension.create({
      name: "runAttributes",
      addGlobalAttributes: () => [
        {
          types: ["codeBlock"],
          attributes: { run: { default: false }, packages: { default: "" }, hideCode: { default: false }, autorun: { default: false }, title: { default: "" }, height: { default: "" } },
        },
      ],
    }),
  ],
  markdown: {
    tokens: {
      fence: {
        block: "codeBlock",
        noCloseToken: true,
        getAttrs: (tok) => {
          const { kind, attrs } = parseInfo(tok.info.trim());
          const run = attrs.run === "true";
          return { language: kind || null, run, packages: run ? (attrs.packages ?? "") : "", hideCode: run && attrs["hide-code"] === "true", autorun: run && attrs.autorun === "true", title: run ? (attrs.title ?? "") : "", height: run ? (attrs.height ?? "") : "" };
        },
      },
    },
    nodes: {
      codeBlock: (state, node, _p, _i, h) => h.writeFence(state, node, codeInfo(node.attrs), node.textContent),
    },
  },
  convert: {
    targets: [
      {
        id: "runnable",
        label: "Runnable code",
        rank: 61,
        convert: (blocks, ctx) => {
          const b = blocks.length === 1 ? blocks[0]! : null;
          if (!b || b.type.name !== "codeBlock" || b.attrs.run || !RUNTIMES.includes(String(b.attrs.language ?? ""))) return null;
          return [ctx.schema.nodes.codeBlock!.create({ ...b.attrs, run: true }, b.content)];
        },
      },
      {
        id: "codeBlock",
        label: "",
        convert: (blocks, ctx) => {
          const b = blocks.length === 1 ? blocks[0]! : null;
          if (!b || b.type.name !== "codeBlock" || !b.attrs.run) return null;
          return [ctx.schema.nodes.codeBlock!.create({ ...b.attrs, run: false }, b.content)];
        },
      },
    ],
  },
});

const QuizBlank = Node.create({
  name: "quizBlank",
  group: "inline",
  inline: true,
  atom: true,
  parseHTML: () => [{ tag: "span[data-quiz-blank]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes({ "data-quiz-blank": "" }, HTMLAttributes), "___"],
});

function quizBlankRule(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.slice(pos, pos + 3) !== "___" || src.charCodeAt(pos + 3) === 0x5f || (pos > 0 && src.charCodeAt(pos - 1) === 0x5f)) return false;
  if (!silent) state.push("quiz_blank", "span", 0);
  state.pos = pos + 3;
  return true;
}

export const quizBlanks = defineEditorExtension({
  name: "quizBlanks",
  formats: ["markdown"],
  tiptap: [QuizBlank],
  markdown: {
    plugins: [(md, ctx) => void (ctx.inline && md.inline.ruler.before("emphasis", "quiz_blank", quizBlankRule))],
    tokens: { quiz_blank: { node: "quizBlank" } },
    nodes: { quizBlank: (state) => state.write("___") },
  },
});

const cells = defineFenceBlock({ kind: "cell", ensureId: true });
cells.markdown!.normalize = (doc) => {
  const seen = new Set<string>();
  let changed = false;
  const nodes: PMNode[] = [];
  doc.forEach((n) => {
    if (n.type.name !== "cellBlock") return void nodes.push(n);
    const attrs = n.attrs.attrs as Record<string, string>;
    let id = attrs.id ?? "";
    if (!id || seen.has(id)) {
      id = newBlockId();
      changed = true;
    }
    seen.add(id);
    nodes.push(n.type.create({ ...n.attrs, attrs: { ...attrs, id } }));
  });
  return changed ? doc.type.create(doc.attrs, nodes) : doc;
};

export const exampleBlocks: EditorExtension[] = [
  panes,
  definitions,
  flashcards,
  mermaid,
  runnable,
  quizBlanks,
  cells,
  defineFenceBlock({ kind: "quiz", slash: { group: "activities", rank: 10, label: "Quiz" } }),
  defineFenceBlock({ kind: "assignment", ensureId: true }),
  defineFenceBlock({ kind: "synced" }),
  defineFenceBlock({ kind: "embed" }),
  defineFenceBlock({ kind: "poll" }),
  defineFenceBlock({ kind: "plot" }),
  defineFenceBlock({ kind: "circuit" }),
];

export const EXAMPLE_BASE = { math: true, details: true, footnotes: true } as const;
