import { describe, expect, it } from "vitest";
import { createDocument, getHTMLFromFragment } from "@tiptap/core";
import { markdownFor } from "../src/markdown";
import { resolveConfig, schemaFor } from "../src/schema";
import { clipboardText } from "../src/index";
import { Slice } from "@tiptap/pm/model";

const config = resolveConfig("html", undefined);
const schema = schemaFor(config);
const toHtml = (html: string) => getHTMLFromFragment(createDocument(html, schema).content, schema);

function stable(html: string): string {
  const once = toHtml(html);
  expect(toHtml(once)).toBe(once);
  return once;
}

describe("html round trips", () => {
  it("keeps callouts by variant and their blocks", () => {
    const out = stable('<div data-type="callout" data-variant="warning"><p>Mind the <strong>badger</strong>.</p><ul><li><p>sett</p></li></ul></div>');
    expect(out).toBe('<div data-type="callout" data-variant="warning" class="wy-callout"><p>Mind the <strong>badger</strong>.</p><ul><li><p>sett</p></li></ul></div>');
    expect(createDocument(out, schema).firstChild!.attrs).toMatchObject({ type: "warning", title: "" });
  });

  it("keeps text colours, multicolour highlights, underline and alignment", () => {
    const out = stable('<p style="text-align: center"><span style="color: #dc2626">Red otter</span> and <mark data-color="#bbf7d0" style="background-color: #bbf7d0; color: inherit">green mark</mark> <u>under</u></p><h2 style="text-align: right">Right</h2>');
    const doc = createDocument(out, schema);
    expect(doc.child(0).attrs.textAlign).toBe("center");
    expect(doc.child(0).child(0).marks[0]!.attrs.color).toBe("#dc2626");
    expect(doc.child(0).child(2).marks[0]!.attrs.color).toBe("#bbf7d0");
    expect(doc.child(0).child(4).marks.map((m) => m.type.name)).toEqual(["underline"]);
    expect(doc.child(1).attrs).toMatchObject({ level: 2, textAlign: "right" });
  });

  it("keeps task lists with their checked state", () => {
    const out = stable('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>dig</p></li><li data-type="taskItem" data-checked="false"><p>nap</p></li></ul>');
    const list = createDocument(out, schema).firstChild!;
    expect(list.type.name).toBe("taskList");
    expect([list.child(0).attrs.checked, list.child(1).attrs.checked]).toEqual([true, false]);
  });

  it("reads older images with pixel widths and keeps them, writes percent widths after a resize", () => {
    const old = '<p data-type="image" style="text-align: center"><img src="https://example.com/otter.png" alt="otter" width="300" data-align="center"></p>';
    const out = stable(old);
    const fig = createDocument(out, schema).firstChild!;
    expect(fig.type.name).toBe("figure");
    expect(fig.attrs).toMatchObject({ src: "https://example.com/otter.png", alt: "otter", align: "center", pixels: 300, width: null });
    expect(out).toContain('width="300"');
    const resized = schema.nodes.figure!.create({ ...fig.attrs, width: 60, pixels: null });
    const html = getHTMLFromFragment(schema.topNodeType.create(null, resized).content, schema);
    expect(html, html).toMatch(/data-width="60"/);
    expect(createDocument(html, schema).firstChild!.attrs).toMatchObject({ width: 60, pixels: null });
    expect(toHtml(html)).toBe(html);
  });

  it("writes a captioned image as a figure", () => {
    const out = stable('<figure data-type="image" data-align="right"><img src="/badger.png" alt="b"><figcaption>A badger</figcaption></figure>');
    expect(createDocument(out, schema).firstChild!.attrs).toMatchObject({ caption: "A badger", align: "right" });
    expect(out.startsWith("<figure")).toBe(true);
  });

  it("keeps tables with a header row and cell alignment", () => {
    const out = stable("<table><tbody><tr><th><p>Animal</p></th><th><p>Legs</p></th></tr><tr><td><p>Badger</p></td><td style=\"text-align: right\"><p>4</p></td></tr></tbody></table>");
    const table = createDocument(out, schema).firstChild!;
    expect(table.child(0).child(0).type.name).toBe("tableHeader");
    expect(table.child(1).child(1).attrs.align).toBe("right");
  });

  it("converts pasted markdown text into the html schema and copies it as text", () => {
    const md = markdownFor(config);
    const slice = md.slice("## Otters\n\n- swim\n- [x] eat\n\n> [!WARNING] Cold\n> water");
    const html = getHTMLFromFragment(slice.content, schema);
    expect(html).toContain("<h2>Otters</h2>");
    expect(html).toContain('data-variant="warning"');
    expect(clipboardText(new Slice(slice.content, 0, 0), md)).toContain("## Otters");
  });
});
