import { describe, expect, it } from "vitest";
import { diffDocs, diffHasChanges, type DiffBlock, type DiffInline, type DocMark, type DocNode } from "./docdiff";

const t = (text: string, ...marks: (string | DocMark)[]): DocNode => ({ type: "text", text, ...(marks.length ? { marks: marks.map((m) => (typeof m === "string" ? { type: m } : m)) } : {}) });
const p = (...content: (DocNode | string)[]): DocNode => ({ type: "paragraph", content: content.map((c) => (typeof c === "string" ? t(c) : c)) });
const h = (level: number, text: string): DocNode => ({ type: "heading", attrs: { level, color: null }, content: [t(text)] });
const li = (text: string): DocNode => ({ type: "listItem", content: [p(text)] });
const ul = (...items: string[]): DocNode => ({ type: "bulletList", content: items.map(li) });
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });
const figure = (src: string): DocNode => ({ type: "figure", attrs: { src, alt: "", caption: "", width: null, align: "center" } });
const embed = (url: string): DocNode => ({ type: "embed", attrs: { url, provider: "youtube", height: null } });
const code = (language: string, source: string): DocNode => ({ type: "codeBlock", attrs: { language, meta: "" }, content: [t(source)] });
const cell = (text: string): DocNode => ({ type: "tableCell", content: [p(text)] });
const row = (...cells: string[]): DocNode => ({ type: "tableRow", content: cells.map(cell) });

const handbook = () =>
  doc(
    h(1, "Badger census"),
    p("Every spring the volunteers count the ", t("active", "bold"), " setts, starting within one hour of dusk."),
    h(2, "Route"),
    ul("Walk the north hedge", "Check the old quarry", "Log the spoil heaps"),
    p("Report a sett with fresh bedding to the county recorder."),
    { type: "horizontalRule" },
    p("Questions go to the survey channel."),
  );

/** Renders inline segments as text with [+added] and [-removed] runs. */
const show = (inline: DiffInline[] = []) =>
  inline
    .map((s) => {
      const text = s.kind === "text" ? s.text : `<${s.node.type}>`;
      return s.change === "added" ? `[+${text}]` : s.change === "removed" ? `[-${text}]` : text;
    })
    .join("");

const summary = (blocks: DiffBlock[]) => blocks.map((b) => `${b.change}${b.moved ? " moved" : ""} ${b.node.type}`);
const changed = (blocks: DiffBlock[]) => summary(blocks.filter((b) => b.change !== "same"));

describe("diffDocs", () => {
  it("shows an unchanged document as unchanged", () => {
    const blocks = diffDocs(handbook(), handbook());
    expect(diffHasChanges(blocks)).toBe(false);
    expect(blocks).toHaveLength(7);
  });

  it("marks every block added when there is no older version", () => {
    const blocks = diffDocs(null, handbook());
    expect(blocks.every((b) => b.change === "added")).toBe(true);
    expect(show(blocks[1]!.inline)).toBe("[+Every spring the volunteers count the ][+active][+ setts, starting within one hour of dusk.]");
  });

  it("finds an inserted paragraph between kept blocks", () => {
    const newer = handbook();
    newer.content!.splice(3, 0, p("Bring a red torch."));
    expect(summary(diffDocs(handbook(), newer))).toEqual([
      "same heading",
      "same paragraph",
      "same heading",
      "added paragraph",
      "same bulletList",
      "same paragraph",
      "same horizontalRule",
      "same paragraph",
    ]);
  });

  it("finds deleted blocks and keeps their old content", () => {
    const newer = handbook();
    newer.content!.splice(4, 2);
    const blocks = diffDocs(handbook(), newer);
    expect(changed(blocks)).toEqual(["removed paragraph", "removed horizontalRule"]);
    expect(show(blocks.find((b) => b.change === "removed" && b.node.type === "paragraph")!.inline)).toBe("[-Report a sett with fresh bedding to the county recorder.]");
  });

  it("diffs a reworded paragraph word by word and keeps the older node", () => {
    const newer = handbook();
    newer.content![1] = p("Every spring the volunteers count the ", t("active", "bold"), " setts, starting within thirty minutes of dusk.");
    const blocks = diffDocs(handbook(), newer).filter((b) => b.change !== "same");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.change).toBe("modified");
    expect(blocks[0]!.before).toEqual(handbook().content![1]);
    expect(show(blocks[0]!.inline)).toBe("Every spring the volunteers count the active setts, starting within [-one hour][+thirty minutes] of dusk.");
  });

  it("shows a formatting change as the old words removed and the formatted ones added", () => {
    const newer = handbook();
    newer.content![6] = p("Questions go to the ", t("survey channel", "italic", { type: "link", attrs: { href: "https://chat.example/survey" } }), ".");
    const b = diffDocs(handbook(), newer)[6]!;
    expect(show(b.inline)).toBe("Questions go to the [-survey channel][+survey channel].");
    const added = b.inline!.find((s) => s.change === "added");
    expect(added?.kind === "text" && added.marks.map((m) => m.type)).toEqual(["italic", "link"]);
  });

  it("marks a moved block as moved on both ends", () => {
    const newer = handbook();
    const [para] = newer.content!.splice(4, 1);
    newer.content!.splice(1, 0, para!);
    const blocks = diffDocs(handbook(), newer);
    const moved = blocks.filter((b) => b.moved);
    expect(moved.map((b) => b.change).sort()).toEqual(["added", "removed"]);
    expect(moved.every((b) => b.node.content![0]!.text!.startsWith("Report"))).toBe(true);
    expect(blocks.filter((b) => b.change !== "same" && !b.moved)).toHaveLength(0);
  });

  it("keeps edited blocks in place when an unchanged block moves past them", () => {
    const newer = handbook();
    const [report] = newer.content!.splice(4, 1);
    newer.content!.splice(1, 0, report!);
    newer.content![2] = p("Every spring the volunteers count the ", t("active", "bold"), " setts, starting within thirty minutes of dusk.");
    newer.content![4] = ul("Walk the north hedge", "Log the spoil heaps");
    const blocks = diffDocs(handbook(), newer);
    expect(summary(blocks)).toEqual([
      "same heading",
      "added moved paragraph",
      "modified paragraph",
      "same heading",
      "modified bulletList",
      "removed moved paragraph",
      "same horizontalRule",
      "same paragraph",
    ]);
    expect(summary(blocks[4]!.children!)).toEqual(["same listItem", "removed listItem", "same listItem"]);
  });

  it("diffs list items inside a changed list", () => {
    const newer = handbook();
    newer.content![3] = ul("Walk the north hedge and the ditch", "Check the old quarry", "Log the badger paths", "Photograph the latrines");
    const list = diffDocs(handbook(), newer)[3]!;
    expect(list.change).toBe("modified");
    expect(summary(list.children!)).toEqual(["modified listItem", "same listItem", "modified listItem", "added listItem"]);
    expect(show(list.children![0]!.children![0]!.inline)).toBe("Walk the north hedge[+ and the ditch]");
    expect(show(list.children![2]!.children![0]!.inline)).toBe("Log the [-spoil heaps][+badger paths]");
  });

  it("notices an attribute change such as a heading level", () => {
    const newer = handbook();
    newer.content![2] = h(3, "Route");
    const b = diffDocs(handbook(), newer)[2]!;
    expect(b).toMatchObject({ change: "modified", attrsChanged: true });
    expect(show(b.inline)).toBe("Route");
  });

  it("shows a rewritten paragraph as removed and added", () => {
    const newer = handbook();
    newer.content![4] = p("Otters are counted by another team.");
    expect(changed(diffDocs(handbook(), newer))).toEqual(["removed paragraph", "added paragraph"]);
  });

  it("keeps hard breaks as inline atoms", () => {
    const older = doc(p("Line one", { type: "hardBreak" }, "line two"));
    const newer = doc(p("Line one", { type: "hardBreak" }, "line two and three"));
    expect(show(diffDocs(older, newer)[0]!.inline)).toBe("Line one<hardBreak>line two[+ and three]");
  });
});

describe("diffDocs with atoms", () => {
  it("shows a swapped image as the old one removed and the new one added in place", () => {
    const older = doc(p("Spring survey"), figure("/files/sett-a.jpg"), p("Notes"));
    const newer = doc(p("Spring survey"), figure("/files/sett-b.jpg"), p("Notes"));
    const blocks = diffDocs(older, newer);
    expect(summary(blocks)).toEqual(["same paragraph", "removed figure", "added figure", "same paragraph"]);
    expect(blocks[1]!.node.attrs!.src).toBe("/files/sett-a.jpg");
    expect(blocks[2]!.node.attrs!.src).toBe("/files/sett-b.jpg");
  });

  it("shows a changed embed URL as removed and added", () => {
    const older = doc(embed("https://youtu.be/badger1"));
    const newer = doc(embed("https://youtu.be/badger2"));
    expect(summary(diffDocs(older, newer))).toEqual(["removed embed", "added embed"]);
  });

  it("shows a changed diagram source as the old diagram removed and the new one added", () => {
    const older = doc(code("mermaid", "graph TD\n  sett --> hedge\n  hedge --> quarry"));
    const newer = doc(code("mermaid", "graph TD\n  sett --> hedge\n  hedge --> stream"));
    expect(summary(diffDocs(older, newer))).toEqual(["removed codeBlock", "added codeBlock"]);
  });

  it("still diffs ordinary code word by word", () => {
    const older = doc(code("python", "count = setts + 1"));
    const newer = doc(code("python", "count = setts + 2"));
    const blocks = diffDocs(older, newer);
    expect(blocks[0]!.change).toBe("modified");
    expect(show(blocks[0]!.inline)).toBe("count = setts + [-1][+2]");
  });

  it("lets the caller choose atomic blocks", () => {
    const older = doc(code("python", "count = setts + 1"));
    const newer = doc(code("python", "count = setts + 2"));
    expect(summary(diffDocs(older, newer, { atomic: (n) => n.type === "codeBlock" }))).toEqual(["removed codeBlock", "added codeBlock"]);
  });

  it("shows a changed inline atom as the old one removed and the new one added", () => {
    const mention = (label: string): DocNode => ({ type: "mention", attrs: { kind: "user", id: label, label } });
    const blocks = diffDocs(doc(p("Ask ", mention("Ada"), " first")), doc(p("Ask ", mention("Bob"), " first")));
    expect(show(blocks[0]!.inline)).toBe("Ask [-<mention>][+<mention>] first");
  });

  it("matches a row's cells by position, so a replaced number stays in its column", () => {
    const table = (...rows: DocNode[]): DocNode => ({ type: "table", content: rows });
    const older = doc(table(row("Sett", "Holes"), row("North hedge", "5"), row("Quarry", "3")));
    const newer = doc(table(row("Sett", "Holes"), row("North hedge", "7"), row("Quarry", "3")));
    const [tbl] = diffDocs(older, newer);
    expect(tbl!.change).toBe("modified");
    const changedRow = tbl!.children!.find((r) => r.change !== "same")!;
    expect(summary(changedRow.children!)).toEqual(["same tableCell", "modified tableCell"]);
    expect(show(changedRow.children![1]!.children![0]!.inline)).toBe("[-5][+7]");
  });
});
