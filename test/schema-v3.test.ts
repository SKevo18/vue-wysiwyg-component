import { describe, expect, it } from "vitest";
import { createMarkdown, defineInlineBlock, markdownToHtml, parseNaturalDate } from "../src/index";
import { dateSuggestions } from "../src/editor/mentionItems";
import { loadEmoji, searchEmoji } from "../src/core/emoji";

const BASE = { details: true, toc: true, pageLinks: true, mentions: true, tabs: true, buttons: true, breadcrumbs: true, ai: true, emoji: true };
const md = createMarkdown([], { base: BASE });
const roundTrip = (src: string) => md.serialize(md.parse(src));

function expectExact(src: string) {
  expect(roundTrip(src)).toBe(src);
}

function inlineNodes(src: string, type: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  md.parse(src).descendants((n) => {
    if (n.type.name === type) out.push(n.attrs);
  });
  return out;
}

describe("page links", () => {
  it("keeps paths, addresses and page ids inline with text around them", () => {
    expectExact("See @[Team handbook](/p/abc123) first.\n");
    expectExact("@[Example](https://example.com/a?b=1) and @[Q3 plan](page:p_9x)\n");
    expectExact("@[a \\[b\\] c](/n/42)\n");
    expect(inlineNodes("See @[Team handbook](/p/abc123) first.\n", "pageLink")).toEqual([{ href: "/p/abc123", title: "Team handbook", icon: "" }]);
    const p = md.parse("See @[Doc](/p/1) first.\n").child(0);
    expect([p.child(0).text, p.child(1).type.name, p.child(2).text]).toEqual(["See ", "pageLink", " first."]);
  });

  it("turns the legacy block fence into a paragraph holding the link, the color on the paragraph", () => {
    const doc = md.parse('```page href=/p/abc123 title="Team handbook" icon=📘\n```\n{color=blue_bg}\n');
    const p = doc.child(0);
    expect(p.type.name).toBe("paragraph");
    expect(p.attrs.color).toBe("blue_bg");
    expect(p.childCount).toBe(1);
    expect(p.child(0).type.name).toBe("pageLink");
    expect(p.child(0).attrs).toEqual({ href: "/p/abc123", title: "Team handbook", icon: "📘" });
    expect(md.serialize(doc)).toBe("@[Team handbook](/p/abc123)\n{color=blue_bg}\n");
    expect(roundTrip("```page href=/n/42 title=Grafy\n```\n\nAfter.\n")).toBe("@[Grafy](/n/42)\n\nAfter.\n");
  });

  it("reads a legacy page mention as a page link to page:<id>", () => {
    expect(inlineNodes("Read @[Plan](page:x).\n", "pageLink")).toEqual([{ href: "page:x", title: "Plan", icon: "" }]);
    expect(inlineNodes("Read @[Plan](page:x).\n", "mention")).toEqual([]);
  });

  it("leaves other targets to links and text", () => {
    let found = 0;
    md.parse("@[x](mail:1) and @[y](//evil.example)\n").descendants((n) => void (found += n.type.name === "pageLink" ? 1 : 0));
    expect(found).toBe(0);
  });

  it("encodes spaces and parentheses of a written address", () => {
    const doc = md.parse("x\n");
    const schema = doc.type.schema;
    const link = schema.nodes.pageLink!.create({ href: "/p/a (b)", title: "T" });
    expect(md.serialize(schema.topNodeType.create(null, schema.nodes.paragraph!.create(null, link)))).toBe("@[T](/p/a%20%28b%29)\n");
  });
});

describe("mentions", () => {
  it("keeps reminders and reminder ranges", () => {
    expectExact("@[May 1, 2024, 9:00 AM](date:2024-05-01T09:00!)\n");
    expectExact("@[Trip](date:2024-05-01/2024-05-03!)\n");
    expect(inlineNodes("@[Trip](date:2024-05-01/2024-05-03!)\n", "mention")).toEqual([{ kind: "date", id: "", label: "Trip", start: "2024-05-01", end: "2024-05-03", remind: true }]);
  });

  it("does not read a bad date or a page as a mention", () => {
    expect(inlineNodes("@[x](date:2024-13!x)\n", "mention")).toEqual([]);
  });
});

describe("natural dates", () => {
  // Wednesday 11 November 2026, 10:00 local time
  const now = new Date(2026, 10, 11, 10, 0);
  const cases: [string, string | null, boolean?][] = [
    ["today", "2026-11-11"],
    ["Tomorrow", "2026-11-12"],
    ["yesterday", "2026-11-10"],
    ["friday", "2026-11-13"],
    ["wednesday", "2026-11-11"],
    ["this fri", "2026-11-13"],
    ["next friday", "2026-11-20"],
    ["next monday", "2026-11-16"],
    ["next sunday", "2026-11-22"],
    ["next week", "2026-11-16"],
    ["in 3 days", "2026-11-14"],
    ["in a day", "2026-11-12"],
    ["in 2 weeks", "2026-11-25"],
    ["in one month", "2026-12-11"],
    ["tomorrow 9am", "2026-11-12T09:00"],
    ["tomorrow at 9:30 pm", "2026-11-12T21:30"],
    ["9am tomorrow", "2026-11-12T09:00"],
    ["friday 14:30", "2026-11-13T14:30"],
    ["12am", "2026-11-11T00:00"],
    ["noon", "2026-11-11T12:00"],
    ["dec 24", "2026-12-24"],
    ["may 1", "2027-05-01"],
    ["1st of may 2025", "2025-05-01"],
    ["March 3, 2027", "2027-03-03"],
    ["2024-05-01", "2024-05-01"],
    ["remind me tomorrow 9am", "2026-11-12T09:00", true],
    ["remind friday", "2026-11-13", true],
    ["remind me at 5pm", "2026-11-11T17:00", true],
    ["banana", null],
    ["13pm", null],
    ["25:00", null],
    ["feb 30", null],
    ["remind", null],
    ["", null],
  ];
  it.each(cases)("%s", (input, start, remind = false) => {
    const got = parseNaturalDate(input, now);
    expect(got).toEqual(start === null ? null : { start, remind });
  });

  const ctx = { t: (k: string) => ({ "mention.today": "Today", "mention.tomorrow": "Tomorrow", "mention.yesterday": "Yesterday", "mention.reminder": "Reminder" })[k] ?? k, locale: "en" as const };

  it("offers today, tomorrow and yesterday, completions and the parsed phrase in the @ menu", () => {
    expect(dateSuggestions("", ctx, now).map((s) => s.start)).toEqual(["2026-11-11", "2026-11-12", "2026-11-10"]);
    expect(dateSuggestions("tom", ctx, now).map((s) => s.detail)).toEqual(["Tomorrow"]);
    expect(dateSuggestions("next f", ctx, now).map((s) => [s.start, s.detail])).toEqual([["2026-11-20", "Next friday"]]);
    expect(dateSuggestions("tomorrow 9am", ctx, now)[0]).toMatchObject({ kind: "date", start: "2026-11-12T09:00", label: "Nov 12, 2026, 9:00 AM", remind: false });
    expect(dateSuggestions("remind me friday", ctx, now)[0]).toMatchObject({ start: "2026-11-13", remind: true, detail: "Reminder" });
  });
});

describe("tabs", () => {
  it("keeps poznamkovac's tabs fence with labels, nested fences and empty labels", () => {
    const src = ["````tabs", "==== Python", "```python", "print(1)", "```", "", "==== Java", "```java", "System.out.println(1);", "```", "````", ""].join("\n");
    expectExact(src);
    const tabs = md.parse(src).child(0);
    expect(tabs.type.name).toBe("tabs");
    expect(tabs.childCount).toBe(2);
    expect(tabs.child(1).attrs.label).toBe("Java");
    expect(tabs.child(1).child(0).type.name).toBe("codeBlock");
    expectExact(["```tabs", "====", "A", "", "==== **Bold** label", "B", "```", ""].join("\n"));
  });

  it("renders every tab in html with its label", () => {
    const html = markdownToHtml("```tabs\n==== One\nA\n\n==== Two\nB\n```\n", [], BASE);
    expect(html).toBe('<div data-tabs="" class="wy-tabs"><div data-tab="" data-label="One"><p>A</p></div><div data-tab="" data-label="Two"><p>B</p></div></div>');
  });
});

describe("buttons", () => {
  it("keeps the label and the actions as indented JSON", () => {
    const src = ['```button label="Add task"', "[", "  {", '    "kind": "insert",', '    "markdown": "- [ ] New task"', "  },", "  {", '    "kind": "link",', '    "url": "https://example.com"', "  }", "]", "```", ""].join("\n");
    expectExact(src);
    expect(md.parse(src).child(0).attrs).toEqual({ label: "Add task", actions: [{ kind: "insert", markdown: "- [ ] New task" }, { kind: "link", url: "https://example.com" }] });
    expectExact("```button\n```\n");
  });

  it("writes JSON in any shape the same way and drops what is not an action", () => {
    expect(roundTrip('```button label=Go\n[{"kind":"notify","to":"ada"}, 3, {"x":1}]\n```\n')).toBe('```button label=Go\n[\n  {\n    "kind": "notify",\n    "to": "ada"\n  }\n]\n```\n');
    expect(md.parse("```button label=Go\nnot json\n```\n").child(0).attrs.actions).toEqual([]);
  });

  it("keeps a template with a code fence inside", () => {
    const doc = md.parse("x\n");
    const s = doc.type.schema;
    const b = s.nodes.button!.create({ label: "Snippet", actions: [{ kind: "insert", markdown: "```js\nrun()\n```" }] });
    const out = md.serialize(s.topNodeType.create(null, b));
    expect(roundTrip(out)).toBe(out);
    expect(md.parse(out).child(0).attrs.actions).toEqual([{ kind: "insert", markdown: "```js\nrun()\n```" }]);
  });

  it("keeps label and actions in html", () => {
    const html = markdownToHtml('```button label=Go\n[{"kind":"link","url":"https://example.com"}]\n```\n', [], BASE);
    expect(html).toBe('<div data-type="button" class="wy-button-block" data-label="Go" data-actions="[{&quot;kind&quot;:&quot;link&quot;,&quot;url&quot;:&quot;https://example.com&quot;}]"><button type="button" class="wy-button">Go</button></div>');
  });
});

describe("breadcrumbs and AI blocks", () => {
  it("keeps breadcrumbs", () => {
    expectExact("```breadcrumbs\n```\n\n# Title\n");
    expect(md.parse("```breadcrumbs\n```\n").child(0).type.name).toBe("breadcrumbs");
  });

  it("keeps an AI block with its instruction, scope, time and generated blocks", () => {
    const src = ['```ai prompt="Summarize this page" scope=page updated=2026-11-11T09:00:00.000Z', "## Summary", "", "- one", "- two", "```", ""].join("\n");
    expectExact(src);
    const ai = md.parse(src).child(0);
    expect(ai.type.name).toBe("aiBlock");
    expect(ai.attrs).toEqual({ prompt: "Summarize this page", scope: "page", updatedAt: "2026-11-11T09:00:00.000Z" });
    expect(ai.child(1).type.name).toBe("bulletList");
    expectExact('```ai prompt="Draft an intro"\n```\n');
    expect(roundTrip('```ai prompt=Say "hi"\n```\n')).toBe("```ai prompt=Say\n```\n");
  });

  it("renders the generated content in html", () => {
    expect(markdownToHtml('```ai prompt="Write" scope=page\nHello\n```\n', [], BASE)).toBe('<div data-type="ai-block" class="wy-ai-block" data-prompt="Write" data-scope="page"><p>Hello</p></div>');
  });
});

describe("defineInlineBlock", () => {
  const blank = defineInlineBlock({
    name: "quizBlank",
    attrs: { answer: "", width: 0 },
    text: (a) => `[${String(a.answer)}]`,
    markdown: {
      pattern: /\{\{([^{}\n]+)\}\}/,
      parse: (m) => ({ answer: m[1]!.trim() }),
      serialize: (a) => `{{${String(a.answer)}}}`,
    },
  });
  const host = createMarkdown([blank], { base: BASE });

  it("parses and writes a host chip with its own syntax next to text", () => {
    const src = "The capital is {{Paris}} and {{Rome}}.\n";
    expect(host.serialize(host.parse(src))).toBe(src);
    const found: unknown[] = [];
    host.parse(src).descendants((n) => void (n.type.name === "quizBlank" && found.push(n.attrs)));
    expect(found).toEqual([
      { answer: "Paris", width: 0 },
      { answer: "Rome", width: 0 },
    ]);
  });

  it("keeps the chip in html with its attributes", () => {
    const html = host.toHtml("A {{Paris}} b\n");
    expect(html).toBe('<p>A <span data-type="quiz-blank" class="wy-chip wy-quiz-blank" data-answer="Paris" data-width="0">[Paris]</span> b</p>');
  });
});

describe("emoji data", () => {
  it("finds emoji by shortcode, name and tag", async () => {
    const data = await loadEmoji();
    expect(data.list.length).toBeGreaterThan(1500);
    expect(searchEmoji(data, "smile")[0]?.emoji).toBe("😄");
    expect(searchEmoji(data, "smi").length).toBeGreaterThan(3);
    expect(searchEmoji(data, "thumbs up")[0]?.emoji).toBe("👍");
    expect(data.byShortcode.get("tada")?.emoji).toBe("🎉");
    expect(data.list.find((e) => e.emoji === "👋")?.skins?.[0]).toBe("👋🏻");
  });
});
