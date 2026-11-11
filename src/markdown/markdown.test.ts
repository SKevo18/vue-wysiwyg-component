import { describe, expect, it } from "vitest";
import { createMarkdown, markdownFor } from "./index";
import { resolveConfig } from "../schema";
import { flattenToParagraph } from "../schema/nodes";

const md = createMarkdown([], { base: { math: true, details: true, footnotes: true } });
const schema = md.schema;
const roundTrip = (src: string) => md.serialize(md.parse(src));

function expectStable(src: string, keep: string[] = []) {
  const once = roundTrip(src);
  const twice = roundTrip(once);
  expect(twice).toBe(once);
  for (const k of keep) expect(once).toContain(k);
  return once;
}

describe("markdown round trip", () => {
  it("keeps inline formatting, links and images", () => {
    const src = "Text **bold** *italic* ~~strike~~ ==mark== `code` [link](/t/badgers/burrows \"Title\") ![alt](/uploads/a.png \"cap\")\n";
    expect(expectStable(src)).toBe(src);
  });

  it("keeps figure caption, alt, width and alignment; a lone image is a figure node", () => {
    const src = 'Text\n\n![Alt text](/uploads/a.png "Caption *it*"){width=40% align=float-right}\n\n![plain](/uploads/b.png)\n';
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(1).type.name).toBe("figure");
    expect(doc.child(1).attrs).toMatchObject({ src: "/uploads/a.png", alt: "Alt text", caption: "Caption *it*", width: 40, align: "float-right" });
    expect(doc.child(2).attrs).toMatchObject({ src: "/uploads/b.png", caption: null, width: null, align: null });
    expect(roundTrip("a ![x](/u.png){width=30%} b\n")).toBe("a ![x](/u.png){width=30%} b\n");
  });

  it("keeps every heading level", () => {
    const src = "# Title\n\n## Second\n\n##### Fifth\n\n###### Deep\n";
    expect(expectStable(src)).toBe(src);
  });

  it("keeps lists, task lists and nesting", () => {
    const src = "- a\n- b\n  - nested\n\n1. one\n2. two\n\n- [ ] open\n- [x] done\n";
    expect(expectStable(src)).toBe(src);
  });

  it("keeps list styles and own markers on the list they follow", () => {
    const src = "1. one\n2. two\n{style=lower-roman}\n\n- a\n  - inner\n  {marker=★}\n- b\n{style=square}\n\n> - quoted\n> {marker=\"=>\"}\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).attrs).toMatchObject({ listStyle: "lower-roman" });
    expect(doc.child(1).attrs).toMatchObject({ listStyle: "square", marker: null });
    expect(doc.child(1).child(0).child(1).attrs).toMatchObject({ listStyle: null, marker: "★" });
    expect(doc.child(2).child(0).attrs).toMatchObject({ marker: "=>" });
    const adjacent = "- a\n{style=square}\n\n- b\n{style=circle}\n";
    expect(expectStable(adjacent)).toBe(adjacent);
  });

  it("drops default list styles and keeps a mismatched style line as text", () => {
    expect(roundTrip("1. one\n{style=decimal}\n")).toBe("1. one\n");
    expect(roundTrip("- a\n{style=upper-roman}\n")).toBe("- a\n\n{style=upper-roman}\n");
  });

  it("keeps divider width, colour, style and ornament", () => {
    const src = "Text\n\n---\n{width=3 color=teal style=double design=fleuron}\n\n---\n{color=#a1b2c3 char=§}\n\n---\n\nEnd\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(1).attrs).toMatchObject({ width: 3, color: "teal", style: "double", design: "fleuron", char: null });
    expect(doc.child(2).attrs).toMatchObject({ width: 1, color: "#a1b2c3", style: "solid", char: "§" });
    expect(doc.child(3).attrs).toMatchObject({ width: 1, color: null, design: "none" });
  });

  it("keeps lone images inside list items inline", () => {
    const src = "- ![a](/u/a.png)\n- ![b](/u/b.png)\n";
    expect(expectStable(src)).toBe(src);
    const task = "- [ ] ![a](/u/a.png)\n";
    expect(expectStable(task)).toBe(task);
  });

  it("keeps code blocks with language, content and the rest of the info string verbatim", () => {
    const src = "```python\nprint('x')\n\nif a > b:\n    pass\n```\n";
    expect(expectStable(src)).toBe(src);
    const flagged = '```html run hide-code autorun title="Pond counter" height=320\n<button>frog</button>\n```\n';
    expect(expectStable(flagged)).toBe(flagged);
    expect(md.parse(flagged).child(0).attrs).toMatchObject({ language: "html", meta: 'run hide-code autorun title="Pond counter" height=320' });
  });

  it("keeps callouts with title, body blocks and nesting", () => {
    const src = "> [!WARNING] Be careful\n> First paragraph.\n>\n> - item\n>\n> > [!NOTE]\n> > inner\n";
    const out = expectStable(src, ["> [!WARNING] Be careful", "> > [!NOTE]", "> > inner", "> - item"]);
    const doc = md.parse(out);
    expect(doc.firstChild?.type.name).toBe("callout");
    expect(doc.firstChild?.attrs).toMatchObject({ type: "warning", title: "Be careful" });
  });

  it("keeps plain blockquotes and unknown alert kinds separate from callouts", () => {
    const src = "> just a quote\n";
    expect(expectStable(src)).toBe(src);
    expect(md.parse(src).firstChild?.type.name).toBe("blockquote");
    expect(md.parse("> [!WOMBAT] hm\n").firstChild?.type.name).toBe("blockquote");
  });

  it("keeps inline and block math, including the fence form", () => {
    const src = "Energy $E = mc^2$ here.\n\n$$\n\\int_0^1 x\\,dx\n$$\n\n```math\n\\frac{a}{b}\n```\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(1).attrs).toEqual({ tex: String.raw`\int_0^1 x\,dx`, fence: false });
    expect(doc.child(2).attrs).toEqual({ tex: String.raw`\frac{a}{b}`, fence: true });
  });

  it("escapes dollars and double equals typed as text", () => {
    const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("costs $5$ and a == b")])]);
    const out = md.serialize(doc);
    expect(out).toBe("costs \\$5\\$ and a \\== b\n");
    expect(md.parse(out).textContent).toBe("costs $5$ and a == b");
  });

  it("leaves dollars alone without math and keeps unclaimed fences as code", () => {
    const plain = createMarkdown();
    const doc = plain.parse("Price $5 and $6\n\n```quokka id=q\nhop\n```\n");
    expect(doc.child(0).textContent).toBe("Price $5 and $6");
    expect(plain.serialize(doc)).toBe("Price $5 and $6\n\n```quokka id=q\nhop\n```\n");
    expect(doc.child(1).type.name).toBe("codeBlock");
  });

  it("lengthens the fence when a code body contains backticks", () => {
    const code = schema.nodes.codeBlock!.create({ language: "md" }, schema.text("a\n```\nb"));
    expect(md.serialize(schema.topNodeType.create(null, [code]))).toBe("````md\na\n```\nb\n````\n");
  });

  it("parses details fences as containers with title and open, and writes the body back", () => {
    const src = '````details title="Moje riešenie" open\nFirst **bold**.\n\n- item\n\n```python\nx = 1\n```\n````\n\n```details\nClosed\n```\n';
    const once = expectStable(src);
    expect(once).toBe(src);
    const doc = md.parse(once);
    expect(doc.child(0).type.name).toBe("details");
    expect(doc.child(0).attrs).toEqual({ title: "Moje riešenie", open: true, heading: 0, color: null });
    expect(doc.child(0).childCount).toBe(3);
    expect(doc.child(0).child(2).type.name).toBe("codeBlock");
    expect(doc.child(1).attrs).toEqual({ title: "", open: false, heading: 0, color: null });
    expect(roundTrip("```details\n```\n")).toBe("```details\n```\n");
  });

  it("serialises a single node for the copy button", () => {
    const doc = md.parse("Intro.\n\n> [!TIP]\n> Dig.\n");
    expect(md.serializeNode(doc.child(1))).toBe("> [!TIP]\n> Dig.");
    expect(md.serializeNode(doc.child(0).child(0))).toBe("Intro.");
  });

  it("parses and serialises inline fields as one paragraph", () => {
    const doc = md.parseInline("Energy **E** is $mc^2$\nnext line");
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild?.type.name).toBe("paragraph");
    expect(md.serializeInline(doc)).toBe("Energy **E** is $mc^2$ next line");
    expect(md.serializeInline(md.parseInline(""))).toBe("");
  });

  it("keeps tables as GFM pipe tables with escaped pipes", () => {
    const src = "| Feature | Syntax |\n| --- | --- |\n| Bold | `**b**` |\n| Pipe | a \\| b |\n";
    expect(expectStable(src)).toBe(src);
    const table = md.parse(src).firstChild!;
    expect(table.type.name).toBe("table");
    expect(table.firstChild!.firstChild!.type.name).toBe("tableHeader");
    expect(table.child(2).child(1).textContent).toBe("a | b");
  });

  it("keeps marks, inline math, links, <br>, escaped pipes and column alignment in cells", () => {
    const src = [
      "| Left | Center | Right |",
      "| :--- | :---: | ---: |",
      "| **b** *i* `a\\|b` | $x^2$ and [odkaz](/n/1) | one<br>two |",
      String.raw`| a \| b | ==mark== | \<br> stays text |`,
      "",
    ].join("\n");
    expect(expectStable(src)).toBe(src);
    const table = md.parse(src).firstChild!;
    expect(table.child(0).content.content.map((c) => c.attrs.align)).toEqual(["left", "center", "right"]);
    expect(table.child(1).child(1).attrs.align).toBe("center");
    const [marks, math, breaks] = table.child(1).content.content.map((c) => c.firstChild!);
    expect(marks!.child(0).marks.map((m) => m.type.name)).toEqual(["bold"]);
    expect(marks!.lastChild!.marks.map((m) => m.type.name)).toEqual(["code"]);
    expect(marks!.lastChild!.text).toBe("a|b");
    expect(math!.firstChild!.type.name).toBe("mathInline");
    expect(math!.lastChild!.marks[0]!.attrs.href).toBe("/n/1");
    expect(breaks!.content.content.map((n) => n.type.name)).toEqual(["text", "hardBreak", "text"]);
    expect(table.child(2).child(2).textContent).toBe("<br> stays text");
  });

  it("writes a table without a header row as an empty header that reads back as no header", () => {
    const src = "|  |  |\n| --- | --- |\n| a | b |\n| c | d |\n";
    expect(expectStable(src)).toBe(src);
    const table = md.parse(src).firstChild!;
    expect(table.childCount).toBe(2);
    expect(table.firstChild!.firstChild!.type.name).toBe("tableCell");
    expect(table.firstChild!.textContent).toBe("ab");
  });

  it("reads block markdown in a cell as text and flattens block content into one paragraph", () => {
    const src = "| a |\n| --- |\n| > [!NOTE] careful |\n| ```otter id=x``` |\n| - item |\n";
    const table = md.parse(src).firstChild!;
    expect(table.childCount).toBe(4);
    for (let r = 1; r < 4; r++) {
      const cell = table.child(r).firstChild!;
      expect(cell.childCount).toBe(1);
      expect(cell.firstChild!.type.name).toBe("paragraph");
    }
    expect(table.child(1).textContent).toBe("> [!NOTE] careful");
    expect(expectStable(src)).toContain(String.raw`| \> \[!NOTE\] careful |`);

    const blocks = md.parse("> [!TIP] Hint\n> **bold**\n\n- one\n- two\n\n```python\nx = 1\ny = 2\n```\n\n$$\nx\n$$\n");
    const p = flattenToParagraph(blocks.content, schema);
    expect(p.type.name).toBe("paragraph");
    expect(p.textContent).toBe("Hintboldonetwox = 1y = 2");
    expect(p.content.content.filter((n) => n.type.name === "hardBreak")).toHaveLength(6);
    expect(p.lastChild!.type.name).toBe("mathInline");
    const cell = schema.nodes.tableCell!.create(null, p);
    expect(() => cell.check()).not.toThrow();
  });

  it("keeps footnote references and definitions as passthrough", () => {
    const src = "Claim[^1] and more[^src].\n\n[^1]: Source; *Title*; 2024\n\n[^src]: Second\n    continued\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(1).type.name).toBe("footnoteDef");
    expect(doc.child(1).textContent).toBe("Source; *Title*; 2024");
    expect(doc.child(2).textContent).toBe("Second\ncontinued");
  });

  it("keeps hard breaks, horizontal rules and ordered list starts", () => {
    const src = "line one  \nline two\n\n---\n\n3. three\n4. four\n";
    expect(expectStable(src)).toBe(src);
  });

  it("keeps file chips as links with their size title", () => {
    const src = 'See [badger-map.pdf](/uploads/2026/badger-map.pdf "1,2 MB") here.\n';
    expect(expectStable(src)).toBe(src);
  });

  it("parses a full representative document without dropping blocks", () => {
    const src = [
      "## Intro",
      "",
      "Text with **bold** and $x^2$.",
      "",
      "> [!TIP] In practice",
      "> Use `git`.",
      "",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "- [x] done",
      "",
      "$$",
      "a+b",
      "$$",
      "",
      "[^1]: source",
      "",
    ].join("\n");
    expect(expectStable(src)).toBe(src);
    expect(md.parse(src).childCount).toBe(7);
  });
});

describe("colours and underline", () => {
  const marksOf = (src: string) => {
    const out: { text: string; marks: Record<string, unknown> }[] = [];
    md.parse(src).descendants((n) => {
      if (n.isText) out.push({ text: n.text!, marks: Object.fromEntries(n.marks.map((m) => [m.type.name, m.attrs.color ?? true])) });
    });
    return out;
  };

  it("keeps text colour, background colour, both together and plain highlight", () => {
    const src = "A [red]{color=red} word, [marked]{bg=yellow}, [both]{color=blue bg=pink} and ==plain== mark.\n";
    expect(expectStable(src)).toBe(src);
    const marks = marksOf(src);
    expect(marks.find((m) => m.text === "red")!.marks).toEqual({ textStyle: "red" });
    expect(marks.find((m) => m.text === "marked")!.marks).toEqual({ highlight: "yellow_bg" });
    expect(marks.find((m) => m.text === "both")!.marks).toEqual({ textStyle: "blue", highlight: "pink_bg" });
    expect(marks.find((m) => m.text === "plain")!.marks).toEqual({ highlight: true });
  });

  it("nests colours with links and other marks, and writes overlapping runs separately", () => {
    const src = "[**bold** and [link](/p/1)]{color=green} then [[label](https://x.example)]{color=red}\n";
    expect(expectStable(src)).toBe(src);
    expect(marksOf(src).find((m) => m.text === "link")!.marks).toMatchObject({ textStyle: "green", link: true });
    const overlap = expectStable("[a [b]{bg=yellow}]{color=red}\n");
    expect(marksOf(overlap).find((m) => m.text === "b")!.marks).toEqual({ textStyle: "red", highlight: "yellow_bg" });
  });

  it("reads background tokens written either way and leaves unknown colours as text", () => {
    expect(roundTrip("[x]{bg=yellow_bg} [y]{color=gray_bg}\n")).toBe("[x]{bg=yellow} [y]{bg=gray}\n");
    expect(roundTrip("[x]{color=teal} [y]{bg=#fff}\n")).toBe("\\[x\\]{color=teal} \\[y\\]{bg=#fff}\n");
  });

  it("keeps underline and escapes literal plus pairs", () => {
    const src = "Some ++underlined *text*++ here.\n";
    expect(expectStable(src)).toBe(src);
    expect(marksOf(src).find((m) => m.text === "underlined ")!.marks).toEqual({ underline: true });
    const literal = md.serialize(schema.node("doc", null, [schema.node("paragraph", null, [schema.text("a ++b++ c")])]));
    expect(literal).toBe("a \\++b\\++ c\n");
    expect(marksOf(literal)[0]!.marks).toEqual({});
  });

  it("keeps block colours on paragraphs, headings, quotes and collapsibles", () => {
    const src = "Plain\n{color=red}\n\n## Title\n{color=blue_bg}\n\n> quoted\n{color=gray_bg}\n\n> inner\n> {color=green}\n\n```details title=More\nBody\n```\n{color=yellow_bg}\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).attrs.color).toBe("red");
    expect(doc.child(1).attrs.color).toBe("blue_bg");
    expect(doc.child(2).attrs.color).toBe("gray_bg");
    expect(doc.child(2).child(0).attrs.color).toBe(null);
    expect(doc.child(3).attrs.color).toBe(null);
    expect(doc.child(3).child(0).attrs.color).toBe("green");
    expect(doc.child(4).type.name).toBe("details");
    expect(doc.child(4).attrs.color).toBe("yellow_bg");
  });

  it("keeps list item colours after the item's first line, next to list styles", () => {
    const src = "- one\n  {color=red}\n- two\n  {color=purple_bg}\n  - nested\n    {color=green}\n{style=square}\n\n1. first\n   {color=orange}\n\n- [ ] task\n  {color=pink_bg}\n";
    expect(expectStable(src)).toBe(src);
    const doc = md.parse(src);
    expect(doc.child(0).attrs.listStyle).toBe("square");
    expect(doc.child(0).child(0).attrs.color).toBe("red");
    expect(doc.child(0).child(0).child(0).attrs.color).toBe(null);
    expect(doc.child(0).child(1).attrs.color).toBe("purple_bg");
    expect(doc.child(0).child(1).child(1).child(0).attrs.color).toBe("green");
    expect(doc.child(1).child(0).attrs.color).toBe("orange");
    expect(doc.child(2).child(0).type.name).toBe("taskItem");
    expect(doc.child(2).child(0).attrs).toMatchObject({ checked: false, color: "pink_bg" });
  });

  it("leaves unknown or misplaced attribute lines as text and never writes cell colours", () => {
    expect(roundTrip("Plain\n{color=teal}\n")).toBe("Plain {color=teal}\n");
    expect(roundTrip("- a\n{color=red}\n")).toBe("- a\n\n{color=red}\n");
    const table = schema.node("doc", null, [
      schema.node("table", null, [schema.node("tableRow", null, [schema.node("tableHeader", { color: "red_bg" }, [schema.node("paragraph", { color: "red" }, [schema.text("h")])])])]),
    ]);
    expect(md.serialize(table)).toBe("| h |\n| --- |\n");
  });

  it("writes html documents' colours as markdown only when they are palette colours", () => {
    const html = markdownFor(resolveConfig("html", {}));
    const s = html.schema;
    const doc = s.node("doc", null, [s.node("paragraph", null, [s.text("x", [s.marks.textStyle!.create({ color: "#123456" })]), s.text(" y", [s.marks.highlight!.create({ color: "#fef08a" })]), s.text(" z", [s.marks.textStyle!.create({ color: "red" })])])]);
    expect(html.serialize(doc)).toBe("x ==y== [z]{color=red}\n");
  });
});
