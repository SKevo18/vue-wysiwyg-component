import { describe, expect, it } from "vitest";
import { createDocument, getHTMLFromFragment } from "@tiptap/core";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { clipboardText, cleanPastedHtml, createMarkdown, looksLikeMarkdown, pasteAsMarkdown } from "../src/index";
import { resolveConfig, schemaFor } from "../src/schema";
import { EXAMPLE_BASE, exampleBlocks } from "./example-blocks";

const md = createMarkdown(exampleBlocks, { base: EXAMPLE_BASE });
const schema = md.schema;
const quizFence = ['```quiz id=cia title="CIA basics"', "? Which one? {points=2}", "( ) A", "(x) B", "> Because.", "```"].join("\n");

describe("looksLikeMarkdown", () => {
  it("leaves single words and URLs to the plain-text paste", () => {
    for (const t of ["hello", "https://example.com/a?b=c", "John Smith", "3.14"]) expect(looksLikeMarkdown(t), t).toBe(false);
  });

  it("recognises block starts, inline syntax and multi-line text", () => {
    for (const t of ["# Title", "- item", "* item", "> quote", "```python", "| a | b |", "a **b**", "a ==b==", "$x$", "[link](/n/1)", "one\ntwo"]) {
      expect(looksLikeMarkdown(t), t).toBe(true);
    }
  });
});

describe("pasteAsMarkdown", () => {
  it("parses markdown text without html or with a code editor's styled html", () => {
    expect(pasteAsMarkdown("# Title\ntext", "")).toBe(true);
    expect(pasteAsMarkdown("# Title\ntext", '<div style="color:#333"><div><span style="color:#000"># Title</span></div><div>text</div></div>')).toBe(true);
  });

  it("leaves prosemirror's own html and structured html to the html parser", () => {
    expect(pasteAsMarkdown("- a\n- b", '<ul data-pm-slice="2 2 []"><li><p>a</p></li></ul>')).toBe(false);
    expect(pasteAsMarkdown("- a\n- b", "<ul><li>a</li><li>b</li></ul>")).toBe(false);
    expect(pasteAsMarkdown("See [docs]", '<p>See <a href="/d">docs</a></p>')).toBe(false);
  });

  it("never parses plain words or empty text", () => {
    expect(pasteAsMarkdown("hello", "")).toBe(false);
    expect(pasteAsMarkdown("  \n ", "")).toBe(false);
  });
});

describe("clipboard markdown", () => {
  it("copies a selected custom block as its fence and pastes it back as a block", () => {
    const doc = md.parse(`Intro\n\n${quizFence}\n\nOutro\n`);
    expect(doc.child(1).type.name).toBe("quizBlock");
    const copied = clipboardText(NodeSelection.create(doc, doc.child(0).nodeSize).content(), md);
    expect(copied).toBe(quizFence);

    const target = md.parse("Target\n\n\n\nEnd\n");
    const state = EditorState.create({ doc: target, selection: TextSelection.create(target, target.child(0).nodeSize + 1) });
    const pasted = state.apply(state.tr.replaceSelection(md.slice(copied))).doc;
    expect(pasted.child(1).type.name).toBe("quizBlock");
    expect(pasted.child(1).attrs).toEqual(doc.child(1).attrs);
    expect(md.serialize(pasted)).toBe(`Target\n\n${quizFence}\n\nEnd\n`);
  });

  it("copies inline selections as one line of inline markdown", () => {
    const doc = md.parse("Some **bold** text\n");
    expect(clipboardText(TextSelection.create(doc, 1, doc.child(0).nodeSize - 1).content(), md)).toBe("Some **bold** text");
  });

  it("merges a pasted paragraph into the surrounding text", () => {
    const target = md.parse("ab\n");
    const state = EditorState.create({ doc: target, selection: TextSelection.create(target, 2) });
    const pasted = state.apply(state.tr.replaceSelection(md.slice("**x**"))).doc;
    expect(pasted.childCount).toBe(1);
    expect(md.serialize(pasted)).toBe("a**x**b\n");
    expect(schema.nodes.quizBlock).toBeDefined();
  });
});

describe("cleanPastedHtml", () => {
  it("turns style-only formatting into tags and drops junk, classes and other styles", () => {
    const html =
      '<!--StartFragment--><style>p{}</style><p class="MsoNormal" style="margin:0;color:red"><span style="font-weight:700">Badger</span> <span style="font-style:italic">sett</span> <span lang="sk">burrow</span></p><p style="text-align:center">Otter</p><div>Plain line</div><p>&nbsp;</p>';
    expect(cleanPastedHtml(html)).toBe('<p><strong>Badger</strong> <em>sett</em> burrow</p><p style="text-align: center">Otter</p><p>Plain line</p>');
  });

  it("passes the editor's own html through only when an element carries data-pm-slice", () => {
    const own = '<p data-pm-slice="1 1 []" style="color: red">kept</p>';
    expect(cleanPastedHtml(own)).toBe(own);
    expect(cleanPastedHtml('<p style="color: red" title="data-pm-slice">x</p><!-- data-pm-slice -->')).toBe("<p>x</p>");
    expect(pasteAsMarkdown("- a\n- b", "<p>data-pm-slice</p>")).toBe(true);
  });
});

const HOSTILE = "x);background:url(https://evil.example/t.png);position:fixed;inset:0;z-index:99999;--z:(";

describe("hostile html attributes", () => {
  for (const format of ["html", "markdown"] as const) {
    const schema = schemaFor(resolveConfig(format, undefined));
    const render = (html: string) => getHTMLFromFragment(createDocument(html, schema).content, schema);
    const paste = (html: string) => {
      const div = document.createElement("div");
      div.innerHTML = cleanPastedHtml(html);
      return getHTMLFromFragment(PMDOMParser.fromSchema(schema).parseSlice(div).content, schema);
    };

    it(`never lets divider attributes into the style (${format}, content and paste)`, () => {
      const hr = `<hr data-color="${HOSTILE}" data-style="${HOSTILE}" data-width="${HOSTILE}" data-char="a&#10;b">`;
      for (const out of [render(hr), paste(`<div data-pm-slice="0 0 []">${hr}</div>`)]) {
        expect(out).not.toContain("evil.example");
        expect(out).not.toContain("position");
        expect(out).toContain('class="wy-divider"');
      }
      expect(render('<hr data-color="teal" data-style="dashed" data-width="3">')).toContain("--wy-divider-color: var(--vc-tint-teal)");
    });

    it(`never lets list style or marker attributes into the style (${format})`, () => {
      const list = `<ul data-list-style="${HOSTILE}" data-marker="&quot;&#10;}body{background:red}"><li><p>a</p></li></ul><ol data-list-style="disc"><li><p>b</p></li></ol>`;
      for (const out of [render(list), paste(`<div data-pm-slice="0 0 []">${list}</div>`)]) {
        expect(out).not.toContain("evil.example");
        expect(out).not.toContain("background");
        expect(out).not.toContain("data-list-style");
      }
    });
  }
});
