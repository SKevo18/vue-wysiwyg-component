import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import type { EditorView } from "@tiptap/pm/view";
import { WysiwygEditor, type EditorHandle } from "../src/index";
import { dropSpot, moveBlock } from "../src/editor/blockDrag";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const BASE = { bookmarks: true, columns: true };

async function mountEditor(modelValue: string) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue, base: BASE, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return ready.promise;
}

const LEFT = 100;
const WIDTH = 600;
const ROW = 40;

function stub(el: Element, left: number, top: number, width: number, height: number) {
  Object.defineProperty(el, "getBoundingClientRect", { configurable: true, value: () => new DOMRect(left, top, width, height) });
}

/** lays the top-level blocks out as 30px rows, 40px apart, from y=0 */
function layout(view: EditorView) {
  const kids = [...view.dom.children];
  stub(view.dom, LEFT, 0, WIDTH, kids.length * ROW);
  kids.forEach((el, i) => stub(el, LEFT, i * ROW, WIDTH, ROW - 10));
}

function topLevel(view: EditorView): string[] {
  const out: string[] = [];
  view.state.doc.forEach((n) => out.push(n.type.name === "codeBlock" ? `code:${n.textContent}` : n.type.name === "paragraph" ? `p:${n.textContent}` : n.type.name));
  return out;
}

class FakeTransfer {
  data = new Map<string, string>();
  dropEffect = "none";
  effectAllowed = "all";
  files: File[] = [];
  get types() {
    return [...this.data.keys()];
  }
  clearData() {
    this.data.clear();
  }
  setData(k: string, v: string) {
    this.data.set(k, v);
  }
  getData(k: string) {
    return this.data.get(k) ?? "";
  }
  setDragImage() {}
}

function drag(target: Element, type: string, dt: FakeTransfer, x = 0, y = 0): Event {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, "dataTransfer", { value: dt });
  target.dispatchEvent(e);
  return e;
}

const DOC = "Otter holt.\n\n```bookmark url=https://example.com title=\"Example\"\n```\n\n```js\nconsole.log(1)\n```\n\nBadger sett.\n";

async function grab(handle: EditorHandle, blockIndex: number) {
  const view = handle.editor!.view;
  layout(view);
  const block = view.dom.children[blockIndex]!;
  block.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: LEFT + 20, clientY: blockIndex * ROW + 10 }));
  const grip = document.querySelector<HTMLElement>('.wy-gutter .wy-grip[role="button"]')!;
  const dt = new FakeTransfer();
  drag(grip, "dragstart", dt);
  return { view, grip, dt };
}

describe("block drag from the grip", () => {
  it("moves a bookmark dropped in the handle column beside a code block, never pasting it into the code", async () => {
    const handle = await mountEditor(DOC);
    const { view, grip, dt } = await grab(handle, 1);
    expect(topLevel(view)).toEqual(["p:Otter holt.", "bookmark", "code:console.log(1)", "p:Badger sett."]);
    const code = view.dom.querySelector("code[data-node-view-content], .wy-node-code code:not(.wy-code-highlight)")!;
    // the lower half of the code block's row, 30px left of the content
    const over = drag(code, "dragover", dt, LEFT - 30, 2 * ROW + 25);
    expect(over.defaultPrevented).toBe(true);
    expect(document.querySelector(".wy-drop-guide")).not.toBeNull();
    const drop = drag(code, "drop", dt, LEFT - 30, 2 * ROW + 25);
    drag(grip, "dragend", dt);
    expect(drop.defaultPrevented).toBe(true);
    expect(topLevel(view)).toEqual(["p:Otter holt.", "code:console.log(1)", "bookmark", "p:Badger sett."]);
    expect(handle.getContent().match(/```bookmark/g)).toHaveLength(1);
    expect(document.querySelector(".wy-drop-guide")).toBeNull();
  });

  it("drops nothing when chrome ends the drag early and the drop still arrives over a code block", async () => {
    const handle = await mountEditor(DOC);
    const { view, grip, dt } = await grab(handle, 1);
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    drag(grip, "dragend", dt);
    // anything the editor schedules on dragend has run by the time the real drop arrives
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    const code = view.dom.querySelector(".wy-node-code code:not(.wy-code-highlight)")!;
    const drop = drag(code, "drop", dt, LEFT + 10, 2 * ROW + 10);
    expect(drop.defaultPrevented).toBe(true);
    expect(topLevel(view)).toEqual(["p:Otter holt.", "bookmark", "code:console.log(1)", "p:Badger sett."]);
  });

  it("shows the guide and moves the block over a node view that swallows drag events", async () => {
    const handle = await mountEditor(DOC);
    const { view, dt } = await grab(handle, 3);
    const swallow = view.dom.children[1]!;
    swallow.addEventListener("dragover", (e) => e.stopPropagation());
    swallow.addEventListener("drop", (e) => e.stopPropagation());
    drag(swallow, "dragover", dt, LEFT + 200, ROW + 5);
    expect(document.querySelector(".wy-drop-guide")).not.toBeNull();
    drag(swallow, "drop", dt, LEFT + 200, ROW + 5);
    // the editor keeps an empty line after a trailing code block
    expect(topLevel(view)).toEqual(["p:Otter holt.", "p:Badger sett.", "bookmark", "code:console.log(1)", "p:"]);
  });

  it("cancels a drop outside the editor column", async () => {
    const handle = await mountEditor(DOC);
    const { view, dt } = await grab(handle, 0);
    const over = drag(document.body, "dragover", dt, LEFT + 100, 900);
    expect(dt.dropEffect).toBe("none");
    expect(over.defaultPrevented).toBe(true);
    drag(document.body, "drop", dt, LEFT + 100, 900);
    expect(topLevel(view)[0]).toBe("p:Otter holt.");
  });
});

describe("drop boundaries", () => {
  it("picks the deepest container under the pointer and only the top level from the margin", async () => {
    const handle = await mountEditor("Intro.\n\n```columns\n==== 50\nLeft one.\n\nLeft two.\n\n==== 50\nRight.\n```\n\nOutro.\n");
    const view = handle.editor!.view;
    layout(view);
    const doc = view.state.doc;
    const columnsPos = doc.child(0).nodeSize;
    const columns = doc.child(1);
    // two columns side by side in the second row, their blocks stacked inside
    const columnsDom = view.nodeDOM(columnsPos) as HTMLElement;
    stub(columnsDom, LEFT, ROW, WIDTH, 100);
    let at = columnsPos + 1;
    columns.forEach((column, _o, ci) => {
      stub(view.nodeDOM(at) as HTMLElement, LEFT + ci * 300, ROW, 290, 100);
      let inner = at + 1;
      column.forEach((block, _p, bi) => {
        stub(view.nodeDOM(inner) as HTMLElement, LEFT + ci * 300, ROW + 10 + bi * 40, 290, 30);
        inner += block.nodeSize;
      });
      at += column.nodeSize;
    });
    stub(view.dom.children[2]!, LEFT, ROW + 110, WIDTH, 30);
    const outro = doc.child(0).nodeSize + columns.nodeSize;
    const node = doc.child(2);
    // between the two blocks of the left column
    const leftSecond = columnsPos + 2 + columns.child(0).child(0).nodeSize;
    expect(dropSpot(view, LEFT + 50, ROW + 45, node, outro)?.pos).toBe(leftSecond);
    // the same height in the margin is the top level: below the columns' midpoint
    expect(dropSpot(view, LEFT - 30, ROW + 45, node, outro)?.pos).toBe(columnsPos);
  });
});

describe("moveBlock", () => {
  it("moves up and down in one step and ignores drops on its own edges", async () => {
    const handle = await mountEditor("One.\n\nTwo.\n\nThree.\n");
    const view = handle.editor!.view;
    const one = 0;
    const size = view.state.doc.child(0).nodeSize;
    expect(moveBlock(view.state, one, one)).toBeNull();
    expect(moveBlock(view.state, one, one + size)).toBeNull();
    const down = moveBlock(view.state, one, view.state.doc.content.size)!;
    expect(down.steps).toHaveLength(2);
    view.dispatch(down);
    expect(topLevel(view)).toEqual(["p:Two.", "p:Three.", "p:One."]);
    view.dispatch(moveBlock(view.state, view.state.doc.content.size - size, 0)!);
    expect(topLevel(view)).toEqual(["p:One.", "p:Two.", "p:Three."]);
  });

  it("leaves an empty line in a column whose only block moves out", async () => {
    const handle = await mountEditor("```columns\n==== 50\nAlone.\n\n==== 50\nRight.\n```\n");
    const view = handle.editor!.view;
    const alone = 2;
    expect(view.state.doc.nodeAt(alone)?.textContent).toBe("Alone.");
    view.dispatch(moveBlock(view.state, alone, view.state.doc.content.size)!);
    const columns = view.state.doc.child(0);
    expect(columns.child(0).childCount).toBe(1);
    expect(columns.child(0).child(0).textContent).toBe("");
    expect(view.state.doc.lastChild?.textContent).toBe("Alone.");
  });
});
