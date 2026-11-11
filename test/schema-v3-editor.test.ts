import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { WysiwygEditor, type EditorHandle, type EditorServices } from "../src/index";
import { contextOf } from "../src/editor/context";

const BASE = { details: true, toc: true, pageLinks: true, mentions: true, tabs: true, buttons: true, breadcrumbs: true, ai: true, emoji: true };

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

async function mountEditor(props: Record<string, unknown>) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, { props: { modelValue: "", base: BASE, ...props, onReady: (x: EditorHandle) => ready.resolve(x) }, attachTo: document.body });
  return { wrapper, handle: await ready.promise };
}

async function settle() {
  await flushPromises();
  await nextTick();
}

function key(handle: EditorHandle, k: string) {
  const view = handle.editor!.view;
  return view.someProp("handleKeyDown", (f) => f(view, new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })));
}

/** position of the first node of `type` */
function posOf(handle: EditorHandle, type: string): number {
  let at = -1;
  handle.editor!.state.doc.descendants((n, pos) => {
    if (at < 0 && n.type.name === type) at = pos;
  });
  return at;
}

function caret(handle: EditorHandle, pos: number) {
  const e = handle.editor!;
  e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, pos)));
}

async function typeInPopup(text: string) {
  const input = document.querySelector<HTMLInputElement>(".wy-page-search input")!;
  input.value = text;
  input.dispatchEvent(new Event("input"));
  await vi.waitFor(() => expect(document.querySelector(".wy-page-search .wy-suggest-item")).not.toBeNull(), { timeout: 2000 });
}

describe("inline chips", () => {
  it("steps over a page link with the arrow keys and types before and after it", async () => {
    const { handle } = await mountEditor({ modelValue: "Go @[Doc](/p/1)\n" });
    const at = posOf(handle, "pageLink");
    const after = at + 1;
    caret(handle, after);
    handle.editor!.commands.insertContent("!");
    expect(handle.getContent()).toBe("Go @[Doc](/p/1)!\n");
    caret(handle, after);
    expect(key(handle, "ArrowLeft")).toBe(true);
    const sel = handle.editor!.state.selection;
    expect(sel instanceof NodeSelection).toBe(false);
    expect(sel.from).toBe(at);
    handle.editor!.commands.insertContent("x ");
    expect(handle.getContent()).toBe("Go x @[Doc](/p/1)!\n");
    caret(handle, posOf(handle, "pageLink"));
    expect(key(handle, "ArrowRight")).toBe(true);
    expect(handle.editor!.state.selection.from).toBe(posOf(handle, "pageLink") + 1);
  });

  it("removes a chip with Backspace after it and Delete before it", async () => {
    const { handle } = await mountEditor({ modelValue: "A @[Ada](user:1) B @[Doc](/p/1) C\n" });
    caret(handle, posOf(handle, "mention") + 1);
    expect(key(handle, "Backspace")).toBe(true);
    expect(handle.getContent()).toBe("A  B @[Doc](/p/1) C\n");
    caret(handle, posOf(handle, "pageLink"));
    expect(key(handle, "Delete")).toBe(true);
    expect(handle.getContent()).toBe("A  B  C\n");
  });

  it("leaves the arrow keys alone away from chips", async () => {
    const { handle } = await mountEditor({ modelValue: "Plain text\n" });
    caret(handle, 3);
    expect(key(handle, "ArrowLeft")).toBeFalsy();
  });
});

describe("page links and mentions in the editor", () => {
  const searchMentions = vi.fn(async (q: string, kind?: string) => {
    const pages = [{ kind: "page" as const, id: "map", label: "Sett map", icon: "🗺️" }];
    const users = [{ kind: "user" as const, id: "7", label: "Ada Badger" }];
    return [...(kind === "page" ? [] : users), ...(kind === "user" ? [] : pages)].filter((s) => s.label.toLowerCase().includes(q.toLowerCase()));
  });

  it("inserts a page link from a page result of the @ menu", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi\n", services: { searchMentions } satisfies EditorServices });
    handle.editor!.chain().focus("end").insertContent(" @sett").run();
    await vi.waitFor(() => expect(document.querySelector(".wy-suggest-item")?.textContent).toContain("Sett map"));
    (document.querySelector(".wy-suggest-item") as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("Hi @[Sett map](/p/map)\n");
  });

  it("inserts a page link at the caret from Link to page", async () => {
    const { handle } = await mountEditor({ modelValue: "Read\n", services: { searchMentions } satisfies EditorServices });
    handle.editor!.chain().focus("end").insertContent(" ").run();
    contextOf(handle.editor!).slashItems.find((i) => i.id === "pageLink")!.run(handle.editor!);
    await settle();
    await typeInPopup("sett");
    (document.querySelector(".wy-page-search .wy-suggest-item") as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("Read @[Sett map](/p/map)\n");
  });

  it("mentions a person from the slash menu", async () => {
    const { handle } = await mountEditor({ modelValue: "Ask\n", services: { searchMentions } satisfies EditorServices });
    handle.editor!.chain().focus("end").insertContent(" ").run();
    contextOf(handle.editor!).slashItems.find((i) => i.id === "mentionPerson")!.run(handle.editor!);
    await settle();
    await typeInPopup("ada");
    expect([...document.querySelectorAll(".wy-page-search .wy-suggest-title")].map((e) => e.textContent)).toEqual(["Ada Badger"]);
    (document.querySelector(".wy-page-search .wy-suggest-item") as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("Ask @[Ada Badger](user:7)\n");
  });

  it("inserts a reminder typed in natural language from Date or reminder", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 11, 10, 0) });
    try {
      const { handle } = await mountEditor({ modelValue: "Call\n" });
      handle.editor!.chain().focus("end").insertContent(" ").run();
      contextOf(handle.editor!).slashItems.find((i) => i.id === "date")!.run(handle.editor!);
      await settle();
      await typeInPopup("remind me tomorrow 9am");
      (document.querySelector(".wy-page-search .wy-suggest-item") as HTMLElement).click();
      await settle();
      expect(handle.getContent()).toBe("Call @[Nov 12, 2026, 9:00 AM](date:2026-11-12T09:00!)\n");
      expect(document.querySelector(".wy-mention.is-reminder")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("labels details Toggle list in the slash menu", async () => {
    const { handle } = await mountEditor({ modelValue: "" });
    expect(contextOf(handle.editor!).slashItems.find((i) => i.id === "details")?.label).toBe("Toggle list");
  });
});

describe("emoji", () => {
  it("suggests emoji after a colon and inserts the picked one", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi\n" });
    handle.editor!.chain().focus("end").insertContent(" :smil").run();
    await vi.waitFor(() => expect([...document.querySelectorAll(".wy-suggest-item")].map((i) => i.textContent).join(" ")).toContain(":smile:"), { timeout: 3000 });
    const items = [...document.querySelectorAll(".wy-suggest-item")];
    (items.find((i) => i.textContent?.includes(":smile:")) as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("Hi 😄\n");
  });

  it("opens the full picker from the slash menu and inserts at the caret", async () => {
    const { handle } = await mountEditor({ modelValue: "Hi\n" });
    handle.editor!.chain().focus("end").insertContent(" ").run();
    contextOf(handle.editor!).slashItems.find((i) => i.id === "emoji")!.run(handle.editor!);
    await vi.waitFor(() => expect(document.querySelectorAll(".wy-emoji-popup .wy-emoji").length).toBeGreaterThan(100), { timeout: 3000 });
    const search = document.querySelector<HTMLInputElement>(".wy-emoji-popup input[type=search]")!;
    search.value = "tada";
    search.dispatchEvent(new Event("input"));
    await settle();
    (document.querySelector(".wy-emoji-popup .wy-emoji") as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("Hi 🎉\n");
    expect(document.querySelector(".wy-emoji-popup")).toBeNull();
  });
});

describe("blocks", () => {
  it("inserts a button's template below it and opens its link through the host", async () => {
    const openLink = vi.fn(() => true);
    const src = '```button label="Add task"\n[{"kind":"insert","markdown":"- [ ] Task"},{"kind":"link","url":"/p/tasks"}]\n```\n\nEnd\n';
    const { handle } = await mountEditor({ modelValue: src, services: { openLink } satisfies EditorServices });
    await settle();
    (document.querySelector(".wy-button") as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe('```button label="Add task"\n[\n  {\n    "kind": "insert",\n    "markdown": "- [ ] Task"\n  },\n  {\n    "kind": "link",\n    "url": "/p/tasks"\n  }\n]\n```\n\n- [ ] Task\n\nEnd\n');
    expect(openLink).toHaveBeenCalledWith("/p/tasks", expect.any(MouseEvent));
  });

  it("runs a host action kind", async () => {
    const run = vi.fn();
    const { handle } = await mountEditor({ modelValue: '```button label=Ping\n[{"kind":"ping","to":"ada"}]\n```\n', services: { buttonActions: { ping: { label: "Ping", run } } } satisfies EditorServices });
    await settle();
    (document.querySelector(".wy-button") as HTMLElement).click();
    await settle();
    expect(run).toHaveBeenCalledWith({ kind: "ping", to: "ada" }, expect.objectContaining({ editor: handle.editor, pos: 0 }));
  });

  it("shows breadcrumbs from the host and follows them", async () => {
    const openLink = vi.fn(() => true);
    const breadcrumbs = vi.fn(async () => [
      { title: "Workspace", icon: "🏠", href: "/p/root" },
      { title: "Handbook", href: "/p/handbook" },
    ]);
    await mountEditor({ modelValue: "```breadcrumbs\n```\n", services: { breadcrumbs, openLink } satisfies EditorServices });
    await settle();
    const crumbs = [...document.querySelectorAll(".wy-breadcrumb")];
    expect(crumbs.map((c) => c.textContent)).toEqual(["🏠Workspace", "Handbook"]);
    (crumbs[1] as HTMLElement).click();
    expect(openLink).toHaveBeenCalledWith("/p/handbook", expect.any(MouseEvent));
  });

  it("streams an AI block's content and undoes the whole generation in one step", async () => {
    const calls: unknown[] = [];
    async function* aiGenerate(req: unknown) {
      calls.push(req);
      for (const piece of ["## Sum", "mary\n\n- a", "\n- b"]) {
        await null;
        yield piece;
      }
    }
    const { handle } = await mountEditor({ modelValue: '# Page\n\n```ai prompt="Summarize" scope=page\nOld\n```\n', services: { aiGenerate, aiScopes: [{ id: "page", label: "This page" }] } satisfies EditorServices });
    await settle();
    (document.querySelector(".wy-node-ai .wy-block-tools button") as HTMLElement).click();
    await settle();
    const generate = [...document.querySelectorAll<HTMLButtonElement>(".wy-ai-panel button")].find((b) => b.textContent === "Generate")!;
    generate.click();
    await vi.waitFor(() => expect(handle.getContent()).toMatch(/^# Page\n\n```ai prompt=Summarize scope=page updated=\S+\n## Summary\n\n- a\n- b\n```\n$/), { timeout: 3000 });
    expect(calls).toEqual([{ prompt: "Summarize", scope: "page", document: '# Page\n\n```ai prompt=Summarize scope=page\nOld\n```\n' }]);
    handle.editor!.commands.undo();
    expect(handle.getContent()).toBe("# Page\n\n```ai prompt=Summarize scope=page\nOld\n```\n");
  });

  it("switches tabs from the strip", async () => {
    const { handle } = await mountEditor({ modelValue: "```tabs\n==== One\nA\n\n==== Two\nB\n```\n" });
    await settle();
    const hidden = () => [...document.querySelectorAll(".wy-tab-panel")].map((p) => p.classList.contains("is-hidden"));
    expect(hidden()).toEqual([false, true]);
    (document.querySelector("button.wy-tab") as HTMLElement).click();
    await settle();
    expect(hidden()).toEqual([true, false]);
    expect(handle.editor!.state.selection.$from.parent.textContent).toBe("B");
  });
});
