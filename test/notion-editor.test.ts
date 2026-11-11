import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { WysiwygEditor, type EditorHandle, type EditorServices } from "../src/index";
import { contextOf } from "../src/editor/context";
import { filterItems } from "../src/editor/catalog";

const BASE = { details: true, columns: true, bookmarks: true, embeds: true, toc: true, pageLinks: true, mentions: true };

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

function paste(handle: EditorHandle, text: string) {
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", { value: dt });
  handle.editor!.view.dom.dispatchEvent(event);
}

describe("notion blocks in the editor", () => {
  it("offers bookmark and embed for a lone URL pasted on an empty line and builds the chosen block", async () => {
    const linkPreview = vi.fn(async () => ({ title: "Badger setts", description: "Where badgers live", site: "setts.example" }));
    const { handle } = await mountEditor({ modelValue: "Intro\n", services: { linkPreview } satisfies EditorServices });
    const editor = handle.editor!;
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph" });
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    paste(handle, "https://setts.example/north");
    await settle();
    expect(handle.getContent()).toBe("Intro\n\n<https://setts.example/north>\n");
    const options = [...document.querySelectorAll(".wy-suggest-item .wy-suggest-title")].map((e) => e.textContent);
    expect(options).toEqual(["Keep as link", "Bookmark", "Embed"]);
    (document.querySelectorAll(".wy-suggest-item")[1] as HTMLElement).click();
    await vi.waitFor(() => expect(linkPreview).toHaveBeenCalledWith("https://setts.example/north", expect.any(AbortSignal)));
    await settle();
    expect(handle.getContent()).toBe('Intro\n\n```bookmark url=https://setts.example/north title="Badger setts" description="Where badgers live" site=setts.example\n```\n');
  });

  it("pastes a URL into a line with text as a plain paste", async () => {
    const { handle } = await mountEditor({ modelValue: "Read this \n" });
    handle.editor!.commands.focus("end");
    paste(handle, "https://setts.example/a");
    await settle();
    expect(document.querySelector(".wy-suggest")).toBeNull();
  });

  it("lists the document's headings in the table of contents and follows edits", async () => {
    const { handle } = await mountEditor({ modelValue: "```toc\n```\n\n# Setts\n\n## North\n" });
    await settle();
    const items = () => [...document.querySelectorAll(".wy-toc-item")].map((e) => e.textContent);
    expect(items()).toEqual(["Setts", "North"]);
    handle.editor!.chain().focus("end").insertContent({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "South" }] }).run();
    await settle();
    expect(items()).toEqual(["Setts", "North", "South"]);
  });

  it("opens a page link through the host and shows the host's title", async () => {
    const openLink = vi.fn(() => true);
    const resolveLink = vi.fn(async (href: string) => ({ href, title: "Sett map", icon: "🗺️" }));
    await mountEditor({ modelValue: "```page href=/p/map title=Old\n```\n", services: { openLink, resolveLink } satisfies EditorServices });
    await settle();
    const link = document.querySelector(".wy-page-link-atom .wy-page-link") as HTMLElement;
    expect(link.textContent).toContain("Sett map");
    link.click();
    expect(openLink).toHaveBeenCalledWith("/p/map", expect.any(MouseEvent));
  });

  it("navigates from a legacy page mention with the page path template", async () => {
    const openLink = vi.fn(() => true);
    await mountEditor({ modelValue: "See @[Map](page:abc)\n", base: { ...BASE, pageHref: "/w/{id}" }, services: { openLink } satisfies EditorServices });
    await settle();
    (document.querySelector(".wy-page-link") as HTMLElement).click();
    expect(openLink).toHaveBeenCalledWith("/w/abc", expect.any(MouseEvent));
  });

  it("inserts a mention from the @ menu fed by the host search", async () => {
    const searchMentions = vi.fn(async () => [{ kind: "user" as const, id: "7", label: "Ada Badger", detail: "ada@setts.example" }]);
    const { handle } = await mountEditor({ modelValue: "Hi\n", services: { searchMentions } satisfies EditorServices });
    handle.editor!.chain().focus("end").insertContent(" @ad").run();
    // the menu waits for a pause in typing before it asks the host
    await vi.waitFor(() => expect(document.querySelector(".wy-suggest-item")?.textContent).toContain("Ada Badger"));
    expect(searchMentions).toHaveBeenCalledWith("ad", undefined, expect.any(AbortSignal));
    const first = document.querySelector(".wy-suggest-item") as HTMLElement;
    first.click();
    await settle();
    expect(handle.getContent()).toBe("Hi @[Ada Badger](user:7)\n");
  });

  it("keeps the base mention out unless enabled, so a host mention node is not shadowed", async () => {
    const { handle } = await mountEditor({ modelValue: "@[Ada](user:1)\n", base: { details: true } });
    expect(handle.editor!.schema.nodes.mention).toBeUndefined();
    expect(contextOf(handle.editor!).slashItems.map((i) => i.id)).not.toContain("pageLink");
  });

  it("adds a column and moves a removed column's blocks to its neighbour", async () => {
    const { handle } = await mountEditor({ modelValue: "```columns\n==== 40\nA\n\n==== 60\nB\n```\n" });
    await settle();
    const menu = async () => {
      (document.querySelector(".wy-node-columns [data-block-more]") as HTMLElement).click();
      await settle();
    };
    await menu();
    (document.querySelectorAll(".wy-block-menu .wy-menu-item")[0] as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("```columns\n==== 26.67\nA\n\n==== 40\nB\n\n====\n```\n");
    handle.editor!.commands.setTextSelection(4);
    await menu();
    (document.querySelectorAll(".wy-block-menu .wy-menu-item")[1] as HTMLElement).click();
    await settle();
    expect(handle.getContent()).toBe("```columns\n====\nA\n\nB\n\n====\n```\n");
  });
});

describe("slash filtering", () => {
  it("puts items whose label matches ahead of description matches without splitting groups", () => {
    const item = (id: string, group: string, label: string, keywords: string) => ({ id, group, label, description: "", icon: undefined, keywords: `${id} ${label} ${keywords}`.toLowerCase(), inline: false, enabled: () => true, run: () => {} });
    const items = [item("table", "blocks", "Table", "rows and columns"), item("columns2", "blocks", "2 columns", ""), item("quote", "text", "Quote", "columns of text")];
    expect(filterItems(items, "columns").map((i) => i.id)).toEqual(["columns2", "table", "quote"]);
  });
});
