import { describe, expect, it } from "vitest";
import type { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { createMarkdown } from "../src/index";
import { resolveConfig } from "../src/schema";
import { convertRegistry, convertRun, selectionRun } from "../src/editor/convert";
import { convertBlocks, convertTargets } from "../src/index";
import { EXAMPLE_BASE, exampleBlocks } from "./example-blocks";

const md = createMarkdown(exampleBlocks, { base: EXAMPLE_BASE });
const schema = md.schema;
const roundTrip = (src: string) => md.serialize(md.parse(src));

function expectStable(src: string) {
  const once = roundTrip(src);
  expect(roundTrip(once)).toBe(once);
  return once;
}

describe("example blocks as extensions: round trips", () => {
  it("keeps custom fences with attributes and body verbatim", () => {
    const src = [
      '```quiz id=cia shuffle-answers show-answers=false title="CIA basics"',
      "? Which one? {points=2}",
      "( ) A",
      "(x) B",
      "> Because.",
      "```",
      "",
      "```assignment id=bs1 runtime=python main=a.py points=5 time=3000",
      "Sort it.",
      "",
      "==== a.py",
      "def f(x):",
      "    return x",
      "",
      "==== tests",
      "results = [(True, 'ok', '')]",
      "```",
      "",
      "```synced id=git-basics",
      "```",
      "",
      "```mermaid",
      "graph TD; A-->B",
      "```",
      "",
      "```embed",
      "https://www.youtube.com/watch?v=xyz",
      "```",
      "",
      "```mermaid run",
      "flowchart LR",
      "  A[zork] --> B",
      "```",
      "",
    ].join("\n");
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).type.name).toBe("quizBlock");
    expect(doc.child(0).attrs.attrs).toEqual({ id: "cia", "shuffle-answers": "true", "show-answers": "false", title: "CIA basics" });
    expect(doc.child(1).type.name).toBe("assignmentBlock");
    expect(doc.child(1).attrs.body).toContain("==== tests\nresults");
    expect(doc.child(3).type.name).toBe("mermaidBlock");
    expect(doc.child(4).attrs.body).toBe("https://www.youtube.com/watch?v=xyz");
    expect(doc.child(5).type.name).toBe("codeBlock");
    expect(doc.child(5).attrs).toMatchObject({ language: "mermaid" });
  });

  it("keeps runnable presentation flags as code block attributes", () => {
    const src = '```html run hide-code autorun title="Pond counter" height=320\n<button>frog</button>\n```\n\n```python run hide-code\nprint(42)\n```\n';
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).attrs).toMatchObject({ run: true, hideCode: true, autorun: true, title: "Pond counter", height: "320" });
    expect(doc.child(1).attrs).toMatchObject({ hideCode: true, autorun: false });
  });

  it("writes mermaid code with the run flag so it stays code next to the diagram block", () => {
    const code = schema.nodes.codeBlock!.create({ language: "mermaid" }, schema.text("graph TD; A-->B"));
    const diagram = schema.nodes.mermaidBlock!.create({ attrs: {}, body: "graph TD; A-->B" });
    const out = md.serialize(schema.topNodeType.create(null, [code, diagram]));
    expect(out).toBe("```mermaid run\ngraph TD; A-->B\n```\n\n```mermaid\ngraph TD; A-->B\n```\n");
    expect(expectStable(out)).toBe(out);
  });

  it("lengthens the outer fence when a fence body contains backticks", () => {
    const src = "````assignment id=a\nUse a fence:\n\n```python\nprint(1)\n```\n\n==== m.py\nx = 1\n````\n";
    expect(expectStable(src)).toBe(src);
    const long = schema.nodes.mermaidBlock!.create({ attrs: {}, body: "a\n`````\nb" });
    expect(md.serialize(schema.topNodeType.create(null, [long]))).toBe("``````mermaid\na\n`````\nb\n``````\n");
  });

  it("gives an id-less assignment fence a generated id that survives serialisation", () => {
    const doc = md.parse("```assignment runtime=python\nSort it.\n```\n");
    const attrs = doc.child(0).attrs.attrs as Record<string, string>;
    expect(attrs.id).toMatch(/^[a-z0-9]{8}$/);
    const once = md.serialize(doc);
    expect(once).toBe(`\`\`\`assignment id=${attrs.id} runtime=python\nSort it.\n\`\`\`\n`);
    expect(roundTrip(once)).toBe(once);
  });

  it("renumbers duplicate cell ids through the normaliser", () => {
    const doc = md.parse("```cell id=otter runtime=python\nx = 1\n```\n\n```cell id=otter runtime=python\ny = 2\n```\n");
    const ids = [0, 1].map((i) => (doc.child(i).attrs.attrs as Record<string, string>).id);
    expect(ids[0]).toBe("otter");
    expect(ids[1]).not.toBe("otter");
  });

  it("parses definitions as containers with term, inline flag and number", () => {
    const src = '```definition term="Zork quux" inline\nfoo **bar**\n```\n\n```definition number=false\n![](/uploads/x.svg)\n\nCaption with $x$\n```\n';
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).attrs).toEqual({ number: true, inline: true, term: "Zork quux" });
    expect(doc.child(1).attrs).toEqual({ number: false, inline: false, term: "" });
    expect(doc.child(1).child(1).child(1).type.name).toBe("mathInline");
    expect(roundTrip("```definition\n```\n")).toBe("```definition\n```\n");
  });

  it("parses tabs and steps sections and writes them back", () => {
    const src = '```tabs\n==== Python\nprint(1)\n\n==== Language *C*\nputs("x");\n```\n\n```steps title="Badger dig" animated\n==== First\nDig.\n\n====\nRest.\n```\n';
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).type.name).toBe("tabs");
    expect(doc.child(0).child(1).attrs.label).toBe("Language *C*");
    expect(doc.child(1).attrs).toEqual({ title: "Badger dig", animated: true });
    expect(doc.child(1).child(1).attrs.label).toBe("");
  });

  it("keeps flashcards bodies verbatim", () => {
    const src = '```flashcards title="Zork quux"\nterm :: meaning\n---\nfront\n===\nback\n```\n';
    expect(expectStable(src)).toBe(src);
    expect(md.parse(src).child(0).attrs).toEqual({ attrs: { title: "Zork quux" }, body: "term :: meaning\n---\nfront\n===\nback" });
  });

  it("keeps quiz blanks as ___ chips in inline fields only", () => {
    const doc = md.parseInline("Fill ___ and ___ here, but _em_ stays");
    expect(doc.firstChild!.content.content.filter((n) => n.type.name === "quizBlank")).toHaveLength(2);
    expect(md.serializeInline(doc)).toBe("Fill ___ and ___ here, but *em* stays");
    expect(md.parseInline("____ four").firstChild!.content.content.some((n) => n.type.name === "quizBlank")).toBe(false);
    expect(md.parse("Block ___ text\n").textContent).toBe("Block ___ text");
  });
});

const reg = convertRegistry(resolveConfig("markdown", EXAMPLE_BASE, exampleBlocks), md);

function blocks(src: string): PMNode[] {
  const out: PMNode[] = [];
  md.parse(src).forEach((n) => out.push(n));
  return out;
}

const markdown = (nodes: PMNode[]) => md.serialize(schema.topNodeType.create(null, nodes));

function convert(src: string, ...targets: string[]): string {
  let nodes = blocks(src);
  for (const t of targets) {
    const next = convertBlocks(nodes, t, { extensions: exampleBlocks, base: EXAMPLE_BASE });
    if (!next) throw new Error(`no ${t} conversion of ${markdown(nodes)}`);
    nodes = next;
  }
  return markdown(nodes);
}

const targets = (src: string) => convertTargets(blocks(src), { extensions: exampleBlocks, base: EXAMPLE_BASE });

describe("turn into", () => {
  it("walks a paragraph through heading, quote, callout and the list types and back, keeping marks and formulas", () => {
    const src = "Plom **blik** $x^2$ [kvak](/n/3)\n";
    expect(convert(src, "heading2")).toBe("## Plom **blik** $x^2$ [kvak](/n/3)\n");
    expect(convert(src, "heading2", "quote")).toBe("> ## Plom **blik** $x^2$ [kvak](/n/3)\n");
    expect(convert(src, "heading2", "quote", "callout")).toBe("> [!NOTE]\n> ## Plom **blik** $x^2$ [kvak](/n/3)\n");
    expect(convert(src, "heading2", "quote", "callout", "bulletList")).toBe("- Plom **blik** $x^2$ [kvak](/n/3)\n");
    expect(convert(src, "heading2", "quote", "callout", "bulletList", "orderedList", "taskList")).toBe("- [ ] Plom **blik** $x^2$ [kvak](/n/3)\n");
    expect(convert(src, "heading2", "quote", "callout", "bulletList", "orderedList", "taskList", "paragraph")).toBe(src);
  });

  it("turns paragraphs into one list item each and a list back into paragraphs", () => {
    const src = "Ab *cd*\n\nEf\n\nGh $y$\n";
    expect(convert(src, "orderedList")).toBe("1. Ab *cd*\n2. Ef\n3. Gh $y$\n");
    expect(convert(src, "orderedList", "paragraph")).toBe(src);
  });

  it("puts text into a code block and code lines back into paragraphs", () => {
    expect(convert("Zip $a$\n\n# Zap\n", "codeBlock")).toBe("```\nZip $a$\nZap\n```\n");
    expect(convert("```\nfoo bar\n\nbaz\n```\n", "paragraph")).toBe("foo bar\n\nbaz\n");
  });

  it("swaps a formula block and a paragraph holding only that formula", () => {
    expect(convert("$$\n\\frac{a}{b}\n$$\n", "paragraph")).toBe("$\\frac{a}{b}$\n");
    expect(convert("$\\frac{a}{b}$\n", "mathBlock")).toBe("$$\n\\frac{a}{b}\n$$\n");
    expect(targets("Text $a$\n")).not.toContain("mathBlock");
  });

  it("keeps text and nesting from bullets over numbers and tasks to paragraphs and back", () => {
    const nested = "- Ab\n  - Cd\n  - Ef\n- Gh\n";
    expect(convert(nested, "orderedList")).toBe("1. Ab\n   1. Cd\n   2. Ef\n2. Gh\n");
    expect(convert(nested, "orderedList", "taskList")).toBe("- [ ] Ab\n  - [ ] Cd\n  - [ ] Ef\n- [ ] Gh\n");
    const paragraphs = convert(nested, "orderedList", "taskList", "paragraph");
    expect(paragraphs).toBe("Ab\n\n- [ ] Cd\n- [ ] Ef\n\nGh\n");
    expect(convert(paragraphs, "bulletList")).toBe("- Ab\n  - [ ] Cd\n  - [ ] Ef\n- Gh\n");
  });

  it("keeps task states between task lists and keeps a marker style the new list kind supports", () => {
    expect(convert("- [x] Hop\n- [ ] Lup\n", "orderedList")).toBe("1. Hop\n2. Lup\n");
    expect(convert("- [x] Hop\n- [ ] Lup\n", "steps", "taskList")).toBe("- [ ] Hop\n- [ ] Lup\n");
    expect(convert("1. Ab\n2. Cd\n{style=lower-roman}\n", "bulletList")).toBe("- Ab\n- Cd\n");
    expect(convert("- Ab\n- Cd\n{style=square}\n", "orderedList")).toBe("1. Ab\n2. Cd\n");
  });

  it("makes each item a step (first line as label, the rest as content) and back", () => {
    const src = "- Step *one*\n\n  Body **first**\n- Step two\n";
    const steps = convert(src, "steps");
    expect(steps).toBe("```steps\n==== Step *one*\nBody **first**\n\n==== Step two\n```\n");
    expect(convert(steps, "bulletList")).toBe(src);
    expect(convert(src, "tabs", "steps", "tabs", "bulletList")).toBe(src);
  });

  it("swaps flashcards and a list of front :: back items", () => {
    const cards = "```flashcards\nDog :: hound\n---\nCat\n===\nmeow\n\n*purr*\n```\n";
    const list = convert(cards, "bulletList");
    expect(list).toBe("- Dog :: hound\n- Cat\n\n  meow\n\n  *purr*\n");
    expect(convert(list, "flashcards")).toBe(cards);
    expect(targets("- Dog :: hound\n- Cat\n")).not.toContain("flashcards");
  });

  it("keeps content from callout over details to quote, the title as a bold first line, and back", () => {
    const callout = "> [!TIP] Heading *x*\n> Body $z$\n>\n> - Ab\n";
    expect(convert(callout, "details")).toBe('```details title="Heading *x*"\nBody $z$\n\n- Ab\n```\n');
    const quote = convert(callout, "details", "quote");
    expect(quote).toBe("> **Heading *x***\n>\n> Body $z$\n>\n> - Ab\n");
    expect(convert(quote, "callout")).toBe("> [!NOTE] Heading *x*\n> Body $z$\n>\n> - Ab\n");
    expect(convert(callout, "steps")).toBe("```steps\n==== Heading *x*\nBody $z$\n\n- Ab\n```\n");
    expect(convert(callout, "steps", "definition")).toBe('```definition term="Heading x"\nBody $z$\n\n- Ab\n```\n');
    expect(convert(callout, "unwrap")).toBe("Body $z$\n\n- Ab\n");
  });

  it("flattens several tabs into labelled content and wraps text blocks and lists", () => {
    const tabs = "```tabs\n==== Py\nprint(1)\n\n==== Js\nlog(1)\n```\n";
    expect(convert(tabs, "unwrap")).toBe("**Py**\n\nprint(1)\n\n**Js**\n\nlog(1)\n");
    expect(convert(tabs, "callout")).toBe("> [!NOTE]\n> **Py**\n>\n> print(1)\n>\n> **Js**\n>\n> log(1)\n");
    expect(convert("Ab\n\n- Cd\n", "definitionInline")).toBe("```definition inline\nAb\n\n- Cd\n```\n");
  });

  it("swaps a mermaid code block and the diagram, and toggles runnable code", () => {
    expect(convert("```mermaid run\ngraph TD; A-->B\n```\n", "mermaid")).toBe("```mermaid\ngraph TD; A-->B\n```\n");
    expect(convert("```mermaid\ngraph TD; A-->B\n```\n", "codeBlock")).toBe("```mermaid run\ngraph TD; A-->B\n```\n");
    expect(targets("```python\nx = 1\n```\n")).not.toContain("mermaid");
    expect(convert("```python\nx = 1\n```\n", "runnable")).toBe("```python run\nx = 1\n```\n");
    expect(convert("```python run\nx = 1\n```\n", "codeBlock")).toBe("```python\nx = 1\n```\n");
    expect(targets("```rust\nfn main() {}\n```\n")).not.toContain("runnable");
  });

  it("offers nothing for activities and media, and leaves out the block's own kind", () => {
    expect(targets("```quiz id=abc\n? Q\n- [x] A\n```\n")).toEqual([]);
    expect(targets("Ab\n\n![x](/u.png)\n")).toEqual([]);
    const t = targets("> [!WARNING]\n> Ab\n");
    expect(t).not.toContain("callout");
    expect(t).toContain("paragraph");
    expect(t).not.toContain("unwrap");
    expect(targets("> [!WARNING]\n> Ab\n>\n> - Cd\n")).toContain("unwrap");
    expect(targets("Ab\n")).not.toContain("paragraph");
  });

  it("converts three selected paragraphs into a numbered list in one step and selects its text", () => {
    let s = EditorState.create({ schema, doc: md.parse("Ab\n\nCd\n\nEf\n\nGh\n") });
    const lastEnd = s.doc.child(0).nodeSize + s.doc.child(1).nodeSize + s.doc.child(2).nodeSize - 1;
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 2, lastEnd - 1)));
    const run = selectionRun(s)!;
    expect(run.nodes.map((n) => n.textContent)).toEqual(["Ab", "Cd", "Ef"]);
    const tr = convertRun(reg, s, run, "orderedList", true)!;
    expect(tr.steps).toHaveLength(1);
    const next = s.apply(tr);
    expect(md.serialize(next.doc)).toBe("1. Ab\n2. Cd\n3. Ef\n\nGh\n");
    expect(next.doc.textBetween(next.selection.from, next.selection.to, "|")).toBe("Ab|Cd|Ef");
  });

  it("takes the whole list for a caret inside it and puts the caret in the result", () => {
    let s = EditorState.create({ schema, doc: md.parse("- Ab\n  - Cd\n") });
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 8)));
    const run = selectionRun(s)!;
    expect(run.nodes.map((n) => n.type.name)).toEqual(["bulletList"]);
    const next = s.apply(convertRun(reg, s, run, "steps")!);
    expect(next.selection.$from.parent.textContent).toBe("Cd");
    expect(next.selection.$from.node(1).type.name).toBe("steps");
  });
});
