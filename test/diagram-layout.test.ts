import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { NodeSelection } from "@tiptap/pm/state";
import { createMarkdown } from "../src/markdown";
import { diagramLayout, withDiagramLayout } from "../src/core/media";
import { WysiwygEditor, type EditorHandle } from "../src/index";

const md = createMarkdown([], { base: { diagrams: true } });
const roundTrip = (src: string) => md.serialize(md.parse(src));

describe("diagram layout in the fence info", () => {
  it("round trips width and align after the language", () => {
    const src = "```mermaid width=60 align=center\ngraph LR\n  A --> B\n```\n";
    expect(roundTrip(src)).toBe(src);
    const node = md.parse(src).child(0);
    expect(node.attrs).toMatchObject({ language: "mermaid", meta: "width=60 align=center" });
    expect(diagramLayout(node.attrs.meta as string)).toEqual({ width: 60, align: "center" });
    const uml = "```plantuml align=right\n@startuml\nA -> B\n@enduml\n```\n";
    expect(roundTrip(uml)).toBe(uml);
  });

  it("replaces only the layout words and drops full width", () => {
    expect(withDiagramLayout('title="Flow chart" theme=dark', { width: 40, align: "left" })).toBe('width=40 align=left title="Flow chart" theme=dark');
    expect(withDiagramLayout("width=40 align=left theme=dark", { width: 100, align: null })).toBe("theme=dark");
    expect(withDiagramLayout("width=40", { width: null, align: null })).toBe("");
    expect(diagramLayout("width=250% align=middle")).toEqual({ width: null, align: null });
    expect(diagramLayout("width=5")).toEqual({ width: 10, align: null });
  });
});

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("diagram controls in the editor", () => {
  it("stores the alignment and width picked in the toolbar in the markdown", async () => {
    const ready = Promise.withResolvers<EditorHandle>();
    const updates: string[] = [];
    wrapper = mount(WysiwygEditor, {
      props: { modelValue: "```mermaid\ngraph LR\n  A --> B\n```\n", base: { diagrams: true }, "onUpdate:modelValue": (v: string) => updates.push(v), onReady: (x: EditorHandle) => ready.resolve(x) },
      attachTo: document.body,
    });
    const handle = await ready.promise;
    const view = handle.editor!.view;
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, 0)));
    await vi.waitFor(() => expect(document.querySelector(".wy-media-tools")).not.toBeNull());
    document.querySelector<HTMLButtonElement>('.wy-media-tools button[aria-label="Right"]')!.click();
    const width = document.querySelector<HTMLInputElement>('.wy-media-tools input[type="number"]')!;
    width.value = "55";
    width.dispatchEvent(new Event("change"));
    expect(handle.getContent()).toBe("```mermaid width=55 align=right\ngraph LR\n  A --> B\n```\n");
    await vi.waitFor(() => expect(document.querySelector<HTMLElement>(".wy-code-diagram")!.className).toContain("wy-align-right"));
  });
});
