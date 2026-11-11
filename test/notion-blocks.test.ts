import { describe, expect, it } from "vitest";
import { DOMParser } from "@tiptap/pm/model";
import { createMarkdown, defineFenceBlock, markdownToHtml } from "../src/index";
import { resolveConfig } from "../src/schema";
import { convertBlocks, convertRegistry } from "../src/editor/convert";
import { embedFor } from "../src/core/embeds";
import { PLANTUML_ALPHABET, plantumlEncode, plantumlUrl } from "../src/core/diagrams";
import { tocEntries } from "../src/editor/headings";
import { columnShares } from "../src/builtins/columns";
import { dateLabel } from "../src/core/mentions";

const BASE = { details: true, columns: true, bookmarks: true, embeds: true, toc: true, pageLinks: true, mentions: true, math: true };
const md = createMarkdown([], { base: BASE });
const roundTrip = (src: string) => md.serialize(md.parse(src));

function expectExact(src: string) {
  expect(roundTrip(src)).toBe(src);
}

describe("notion blocks: markdown", () => {
  it("keeps columns with and without widths", () => {
    const src = ["```columns", "==== 30", "Left **text**", "", "==== 70", "- a", "- b", "```", ""].join("\n");
    expectExact(src);
    const doc = md.parse(src);
    const cols = doc.child(0);
    expect(cols.type.name).toBe("columns");
    expect(cols.childCount).toBe(2);
    expect(cols.child(0).attrs.width).toBe(30);
    expect(cols.child(1).child(0).type.name).toBe("bulletList");
    expectExact(["```columns", "====", "A", "", "====", "B", "", "====", "```", ""].join("\n"));
    expect(md.parse("```columns\n====\nA\n\n====\nB\n\n====\n```\n").child(0).child(2).attrs.width).toBeNull();
  });

  it("nests a fence inside a column with a longer outer fence", () => {
    const src = ["````columns", "==== 50", "```python", "print(1)", "```", "", "==== 50", "Text", "````", ""].join("\n");
    expectExact(src);
    expect(md.parse(src).child(0).child(0).child(0).type.name).toBe("codeBlock");
  });

  it("splits shares for columns without a width", () => {
    const doc = md.parse("```columns\n==== 40\nA\n\n====\nB\n\n====\nC\n```\n");
    expect(columnShares(doc.child(0))).toEqual([40, 30, 30]);
  });

  it("writes toggle headings as details with a heading level", () => {
    const src = ["```details title=Setup heading=2 open", "Body", "```", ""].join("\n");
    expectExact(src);
    const d = md.parse(src).child(0);
    expect(d.attrs).toMatchObject({ title: "Setup", heading: 2, open: true });
    expectExact(['```details title="Plain toggle"', "Body", "```", ""].join("\n"));
  });

  it("keeps callout icon and color on the line after the quote", () => {
    const src = ["> [!NOTE] Heads up", "> Body text.", "{icon=💡 color=gray_bg}", "", "After."].join("\n") + "\n";
    expectExact(src);
    const c = md.parse(src).child(0);
    expect(c.type.name).toBe("callout");
    expect(c.attrs).toMatchObject({ type: "note", title: "Heads up", icon: "💡", color: "gray_bg" });
    expect(md.parse(src).child(1).textContent).toBe("After.");
    expectExact("> [!TIP]\n> Only color.\n{color=blue_bg}\n");
    expectExact("> [!TIP]\n> Plain.\n");
  });

  it("leaves an invalid attribute line as text", () => {
    const doc = md.parse("> [!NOTE]\n> Body\n{color=chartreuse}\n");
    expect(doc.child(0).attrs.color).toBeNull();
    expect(doc.textContent).toContain("{color=chartreuse}");
  });

  it("keeps bookmarks with every field", () => {
    const src = '```bookmark url=https://example.com/a?b=c title="Example page" description="A page about it" image=https://example.com/i.png icon=https://example.com/f.ico site=Example\n```\n';
    expectExact(src);
    expect(md.parse(src).child(0).attrs).toEqual({ url: "https://example.com/a?b=c", title: "Example page", description: "A page about it", image: "https://example.com/i.png", icon: "https://example.com/f.ico", site: "Example" });
  });

  it("writes bookmark text without quotes or backticks so the fence stays valid", () => {
    const doc = md.schema.nodes.doc!.create(null, md.schema.nodes.bookmark!.create({ url: "https://x.dev/a b", title: 'Say "hi" `now`\nplease' }));
    const out = md.serialize(doc);
    expect(out).toBe("```bookmark url=https://x.dev/a%20b title=\"Say 'hi' 'now' please\"\n```\n");
    expectExact(out);
  });

  it("keeps embeds and derives the iframe address on parse", () => {
    const src = "```embed url=https://www.youtube.com/watch?v=dQw4w9WgXcQ provider=youtube height=360\n```\n";
    expectExact(src);
    const e = md.parse(src).child(0);
    expect(e.attrs).toMatchObject({ provider: "youtube", height: 360, src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expectExact("```embed url=https://example.com/page provider=generic\n```\n");
  });

  it("drops an iframe address that is not https", () => {
    const e = md.parse("```embed url=javascript:alert(1) provider=generic\n```\n").child(0);
    expect(e.attrs.src).toBe("");
  });

  it("keeps the table of contents with its color", () => {
    expectExact("```toc\n```\n");
    expectExact("```toc\n```\n{color=gray}\n\n# Title\n");
    expect(md.parse("```toc\n```\n{color=gray}\n").child(0).attrs.color).toBe("gray");
  });

  it("keeps every mention form", () => {
    const src = "Ask @[Ada Lovelace](user:58501171) on @[May 1, 2024](date:2024-05-01), @[May 1 to 3](date:2024-05-01/2024-05-03), @[10am](date:2024-05-01T10:00) or @[Call](date:2024-05-01T09:30!).\n";
    expectExact(src);
    const p = md.parse(src).child(0);
    const mentions: Record<string, unknown>[] = [];
    p.forEach((n) => {
      if (n.type.name === "mention") mentions.push(n.attrs);
    });
    expect(mentions).toEqual([
      { kind: "user", id: "58501171", label: "Ada Lovelace", start: null, end: null, remind: false },
      { kind: "date", id: "", label: "May 1, 2024", start: "2024-05-01", end: null, remind: false },
      { kind: "date", id: "", label: "May 1 to 3", start: "2024-05-01", end: "2024-05-03", remind: false },
      { kind: "date", id: "", label: "10am", start: "2024-05-01T10:00", end: null, remind: false },
      { kind: "date", id: "", label: "Call", start: "2024-05-01T09:30", end: null, remind: true },
    ]);
  });

  it("labels picked dates and ranges in the documented format", () => {
    expect(dateLabel("2024-05-01", null, "en")).toBe("May 1, 2024");
    expect(dateLabel("2024-05-01T10:00", null, "en")).toBe("May 1, 2024, 10:00 AM");
    expect(dateLabel("2024-05-01", "2024-05-03", "en")).toBe("May 1, 2024 → May 3, 2024");
    expect(dateLabel("2024-05-01T10:00", "2024-05-03T10:00", "en")).toBe("May 1, 2024, 10:00 AM → May 3, 2024, 10:00 AM");
  });

  it("escapes brackets in mention labels", () => {
    const src = "@[a \\[b\\] c](user:1)\n";
    expectExact(src);
    let label = "";
    md.parse(src).descendants((n) => {
      if (n.type.name === "mention") label = n.attrs.label;
    });
    expect(label).toBe("a [b] c");
  });

  it("keeps mention-like text that is not a mention", () => {
    expectExact("@[x](mail:1) and a@b.c\n");
    const doc = md.parse("@[x](mail:1)\n");
    let found = false;
    doc.descendants((n) => void (found ||= n.type.name === "mention"));
    expect(found).toBe(false);
  });

  it("does not parse mentions unless enabled", () => {
    const plain = createMarkdown([], { base: { details: true } });
    let found = false;
    plain.parse("@[Ada](user:1)\n").descendants((n) => void (found ||= n.type.name === "mention"));
    expect(found).toBe(false);
    expect(plain.parse("```toc\n```\n").child(0).type.name).toBe("codeBlock");
  });

  it("lets a host fence kind win over a base block of the same kind", () => {
    const host = createMarkdown([defineFenceBlock({ kind: "embed" })], { base: BASE });
    const src = "```embed\nhttps://www.youtube.com/watch?v=xyz\n```\n";
    const doc = host.parse(src);
    expect(doc.child(0).type.name).toBe("embedBlock");
    expect(host.serialize(doc)).toBe(src);
  });

  it("renders html for every block", () => {
    const html = markdownToHtml(
      [
        "```columns",
        "==== 40",
        "A",
        "",
        "==== 60",
        "B",
        "```",
        "",
        "```bookmark url=https://example.com title=Example",
        "```",
        "",
        "```embed url=https://vimeo.com/123 provider=vimeo",
        "```",
        "",
        "```page href=/p/x title=Doc",
        "```",
        "",
        "Hi @[Ada](user:1) see @[Doc](page:x)",
        "",
      ].join("\n"),
      [],
      BASE,
    );
    expect(html).toContain('data-type="columns"');
    expect(html).toContain('data-width="40"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://player.vimeo.com/video/123"');
    expect(html).toContain('sandbox="allow-scripts');
    expect(html).toContain('<p><a data-type="page-link" class="wy-page-link" data-href="/p/x" data-title="Doc" href="/p/x">Doc</a></p>');
    expect(html).toContain('<a data-type="page-link" class="wy-page-link" data-href="page:x" data-title="Doc" href="/p/x">Doc</a>');
    expect(html).toContain('<span data-type="mention" class="wy-mention is-user" data-kind="user" data-id="1" data-label="Ada">@Ada</span>');
  });

  it("renders callout colors and toggle headings in html", () => {
    const html = markdownToHtml("> [!TIP] Dig\n> Deep.\n{icon=🦡 color=yellow_bg}\n\n```details title=Setts heading=2\nNorth\n```\n", [], BASE);
    expect(html).toContain('data-icon="🦡"');
    expect(html).toContain('data-color="yellow_bg"');
    expect(html).toContain("--wy-callout-bg: var(--vc-bg-yellow");
    expect(html).toContain("<summary><h2>Setts</h2></summary>");
  });

  it("reads html back into the same nodes", () => {
    const html = markdownToHtml("```columns\n==== 25\nA\n\n====\nB\n```\n\n```embed url=https://youtu.be/dQw4w9WgXcQ provider=youtube height=300\n```\n", [], BASE);
    const host = document.createElement("div");
    host.innerHTML = html;
    const doc = DOMParser.fromSchema(md.schema).parse(host);
    expect(md.serialize(doc)).toBe("```columns\n==== 25\nA\n\n====\nB\n```\n\n```embed url=https://youtu.be/dQw4w9WgXcQ provider=youtube height=300\n```\n");
  });

  it("lists headings and toggle headings for the table of contents", () => {
    const doc = md.parse("# One\n\n```toc\n```\n\n## Two\n\n```details title=Three heading=3\nx\n```\n\n## \n");
    expect(tocEntries(doc).map((e) => [e.level, e.text])).toEqual([
      [1, "One"],
      [2, "Two"],
      [3, "Three"],
    ]);
  });
});

describe("notion blocks: conversions", () => {
  const config = resolveConfig("markdown", BASE, []);
  const reg = convertRegistry(config, md);
  const schema = md.schema;

  it("turns a paragraph into a toggle heading titled with its text", () => {
    const out = convertBlocks(reg, [md.parse("Install **it**\n").child(0)], "toggleHeading2", schema);
    expect(out?.[0]?.attrs).toMatchObject({ title: "Install it", heading: 2 });
  });

  it("turns blocks into columns and back", () => {
    const blocks = [md.parse("A\n").child(0), md.parse("B\n").child(0)];
    const cols = convertBlocks(reg, blocks, "columns", schema)!;
    expect(cols[0]!.type.name).toBe("columns");
    expect(cols[0]!.childCount).toBe(2);
    const back = convertBlocks(reg, cols, "unwrap", schema)!;
    expect(back.map((b) => b.textContent)).toEqual(["A", "B"]);
  });

  it("turns a toggle heading into a plain toggle", () => {
    const d = md.parse("```details title=X heading=1\ny\n```\n").child(0);
    expect(convertBlocks(reg, [d], "details", schema)?.[0]?.attrs.heading).toBe(0);
  });
});

describe("embed providers", () => {
  const cases: [string, string, string][] = [
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42"],
    ["https://www.youtube.com/shorts/abcdefghijk", "youtube", "https://www.youtube-nocookie.com/embed/abcdefghijk"],
    ["https://vimeo.com/76979871/abc123", "vimeo", "https://player.vimeo.com/video/76979871?h=abc123"],
    ["https://www.loom.com/share/0123abcd", "loom", "https://www.loom.com/embed/0123abcd"],
    ["https://www.figma.com/design/KEY/Name?node-id=1", "figma", "https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Fdesign%2FKEY%2FName%3Fnode-id%3D1"],
    ["https://gist.github.com/octo/aa5a315d61ae9438b18d", "gist", "https://gist.github.com/octo/aa5a315d61ae9438b18d.pibb"],
    ["https://www.google.com/maps/place/Bratislava/@48.1,17.1,12z", "maps", "https://maps.google.com/maps?q=Bratislava&z=12&output=embed"],
    ["https://x.com/jack/status/20", "tweet", "https://platform.twitter.com/embed/Tweet.html?id=20&dnt=true"],
    ["https://codepen.io/team/pen/abCDef", "codepen", "https://codepen.io/team/embed/abCDef?default-tab=result"],
    ["https://example.org/widget", "generic", "https://example.org/widget"],
  ];
  it.each(cases)("%s", (url, provider, src) => {
    expect(embedFor(url)).toEqual({ provider, src });
  });

  it("refuses non https addresses", () => {
    expect(embedFor("http://example.org")).toBeNull();
    expect(embedFor("javascript:alert(1)")).toBeNull();
  });
});

describe("plantuml encoding", () => {
  async function decode(encoded: string): Promise<string> {
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; i += 4) {
      const [a, b, c, d] = [0, 1, 2, 3].map((k) => PLANTUML_ALPHABET.indexOf(encoded[i + k]!)) as [number, number, number, number];
      bytes.push((a << 2) | (b >> 4), ((b & 0xf) << 4) | (c >> 2), ((c & 0x3) << 6) | d);
    }
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const reader = stream.getReader();
    let out = "";
    const text = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out += text.decode(value, { stream: true });
      }
    } catch {
      // padding bytes after the final block
    }
    return out;
  }

  it("encodes the source as raw deflate in plantuml's alphabet", async () => {
    const source = "@startuml\nBob -> Alice : hello žltý\n@enduml";
    const encoded = await plantumlEncode(source);
    expect(encoded).toMatch(/^[0-9A-Za-z_-]+$/);
    expect(await decode(encoded)).toBe(source);
    expect(await plantumlUrl("https://www.plantuml.com/plantuml", source)).toBe(`https://www.plantuml.com/plantuml/svg/${encoded}`);
  });
});
