import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { DocDiffView, defineFenceBlock, type DiffBlock } from "../src/index";

const BASE = { details: true, bookmarks: true, embeds: true, diagrams: true };

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

async function mountDiff(props: InstanceType<typeof DocDiffView>["$props"]) {
  const diff = Promise.withResolvers<DiffBlock[]>();
  wrapper = mount(DocDiffView, { props: { base: BASE, ...props, onDiff: (b: DiffBlock[]) => diff.resolve(b) }, attachTo: document.body });
  const blocks = await diff.promise;
  await flushPromises();
  await nextTick();
  return { blocks, root: wrapper.element as HTMLElement };
}

const BEFORE = `# Badger census

Count the active setts within one hour of dusk.

![North sett](/files/sett-a.jpg)

\`\`\`embed url=https://www.youtube.com/watch?v=badger1 provider=youtube
\`\`\`

\`\`\`mermaid
graph TD
  sett --> hedge
\`\`\`

Bring a red torch and a notebook.

Report fresh bedding to the recorder.
`;

const AFTER = `# Badger census

Count the active setts within thirty minutes of dusk.

![North sett](/files/sett-b.jpg)

\`\`\`embed url=https://www.youtube.com/watch?v=badger1 provider=youtube
\`\`\`

\`\`\`mermaid
graph TD
  sett --> quarry
\`\`\`

Report fresh bedding to the recorder.
`;

const texts = (root: HTMLElement, sel: string) => [...root.querySelectorAll(sel)].map((e) => e.textContent?.trim());

describe("DocDiffView", () => {
  it("renders the newer document with the editor's blocks, word changes and removed blocks in place", async () => {
    const { root } = await mountDiff({ before: BEFORE, after: AFTER, format: "markdown" });
    const content = root.querySelector(".wy-content")!;
    expect(content.getAttribute("contenteditable")).toBe("false");

    // the reworded paragraph: old words struck, new ones added, the rest plain
    expect(texts(root, ".wy-diff-del")).toEqual(["one hour"]);
    expect(texts(root, ".wy-diff-ins")).toEqual(["thirty minutes"]);
    expect(content.querySelector("p")!.textContent).toBe("Count the active setts within one hourthirty minutes of dusk.");

    // the swapped image: both rendered by the figure view, old one removed then new one added
    const imgs = [...content.querySelectorAll("img")].map((i) => ({ src: i.getAttribute("src"), state: i.closest(".wy-diff-block")?.classList.contains("wy-diff-removed") ? "removed" : i.closest(".wy-diff-block") ? "added" : "same" }));
    expect(imgs).toEqual([
      { src: "/files/sett-a.jpg", state: "removed" },
      { src: "/files/sett-b.jpg", state: "added" },
    ]);

    // the unchanged embed renders as an embed, unmarked
    const iframe = content.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toContain("youtube");
    expect(iframe.closest(".wy-diff-block")).toBeNull();

    // the diagram source changed: old diagram block removed, new one added
    const diagrams = [...content.querySelectorAll(".wy-diff-block")].filter((b) => b.querySelector(".wy-code-diagram, code"));
    expect(diagrams.map((b) => [...b.classList].filter((c) => c === "wy-diff-removed" || c === "wy-diff-added"))).toEqual([["wy-diff-removed"], ["wy-diff-added"]]);

    // the deleted paragraph is still shown, in its place, as removed
    const removed = [...content.querySelectorAll("p.wy-diff-removed")];
    expect(removed.map((p) => p.textContent)).toEqual(["Bring a red torch and a notebook."]);
    expect(removed[0]!.nextElementSibling?.textContent).toBe("Report fresh bedding to the recorder.");
  });

  it("takes ProseMirror JSON, shows a first version as all added and updates when the versions change", async () => {
    const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
    const { root, blocks } = await mountDiff({ before: null, after: doc("Setts by the quarry") });
    expect(blocks.map((b) => b.change)).toEqual(["added"]);
    expect(texts(root, "p.wy-diff-added")).toEqual(["Setts by the quarry"]);

    await wrapper!.setProps({ before: doc("Setts by the quarry"), after: doc("Setts by the old quarry") });
    await flushPromises();
    expect(root.querySelector(".wy-diff-added")).toBeNull();
    expect(texts(root, ".wy-diff-ins")).toEqual(["old"]);
  });

  it("renders host blocks through the host's extensions and drops nodes the schema does not know", async () => {
    const census = defineFenceBlock({ kind: "census" });
    const before = { type: "doc", content: [{ type: "censusBlock", attrs: { attrs: { area: "north" }, body: "" } }, { type: "orbit", attrs: {} }] };
    const after = { type: "doc", content: [{ type: "censusBlock", attrs: { attrs: { area: "south" }, body: "" } }] };
    const { blocks, root } = await mountDiff({ before, after, extensions: [census] });
    expect(blocks.map((b) => `${b.change} ${b.node.type}`)).toEqual(["removed censusBlock", "added censusBlock"]);
    expect(root.querySelectorAll(".wy-diff-block").length).toBe(2);
  });
});
