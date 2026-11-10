import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { useDraft, type DraftAdapter, type DraftCursor, type DraftRecord } from "../src/index";
import { ServerHistory, type HistoryBridge } from "../src/editor/history";

const cursor = (n: number): DraftCursor => ({ cursor: n, canUndo: n > 0, canRedo: false });

class OfflineError extends Error {}

function adapter() {
  const a = {
    load: vi.fn<DraftAdapter["load"]>(),
    save: vi.fn<DraftAdapter["save"]>(),
    remove: vi.fn<DraftAdapter["remove"]>(),
    undo: vi.fn<NonNullable<DraftAdapter["undo"]>>(),
    redo: vi.fn<NonNullable<DraftAdapter["redo"]>>(),
    isOffline: (e: unknown) => e instanceof OfflineError,
  };
  a.save.mockImplementation(() => Promise.resolve(cursor(a.save.mock.calls.length - 1)));
  a.remove.mockResolvedValue(undefined);
  a.load.mockResolvedValue(null);
  return a;
}

function setup(a: ReturnType<typeof adapter>, over: { title?: boolean; content?: string; newerThan?: string } = {}) {
  const content = ref(over.content ?? "orig");
  const title = ref("Badgers");
  const baseRevision = ref<string | number | null>(6);
  const handle = useDraft(a, { scope: "note:1", content, title: over.title === false ? undefined : title, baseRevision, delay: 100, newerThan: over.newerThan });
  return { content, title, baseRevision, handle };
}

async function settle() {
  await nextTick();
  await vi.advanceTimersByTimeAsync(150);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useDraft", () => {
  it("debounces bursts of typing into one save", async () => {
    const a = adapter();
    const { content, handle } = setup(a, { title: false });
    await handle.load();
    for (const c of ["o", "ot", "ott", "otte", "otter"]) {
      content.value = c;
      await nextTick();
      await vi.advanceTimersByTimeAsync(40);
    }
    expect(a.save).not.toHaveBeenCalled();
    expect(handle.status.value).toBe("idle");
    await settle();
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(a.save.mock.calls[0]![1]).toMatchObject({ content: "otter" });
    expect(handle.status.value).toBe("saved");
  });

  it("restores a newer draft with its base revision so the save still hits conflict detection", async () => {
    const a = adapter();
    a.load.mockResolvedValue({ content: "draft body", title: "Draft T", baseRevision: 5, updatedAt: "2026-03-02T10:00:00Z", cursor: 0 });
    const { content, title, baseRevision, handle } = setup(a, { newerThan: "2026-03-01T10:00:00Z" });
    await handle.load();
    expect(content.value).toBe("draft body");
    expect(title.value).toBe("Draft T");
    expect(baseRevision.value).toBe(5);
    expect(handle.restored.value).toBe(true);
    await settle();
    expect(a.save).not.toHaveBeenCalled();
  });

  it("restores title-only changes and intentional empty metadata without re-saving them", async () => {
    const a = adapter();
    const content = ref("same body");
    const title = ref("Badgers");
    const summary = ref("Old summary");
    const handle = useDraft(a, { scope: "note:1", content, title, summary, delay: 100 });
    a.load.mockResolvedValue({ content: content.value, title: "Otters", summary: "" });
    await handle.load();
    expect(content.value).toBe("same body");
    expect(title.value).toBe("Otters");
    expect(summary.value).toBe("");
    expect(handle.restored.value).toBe(true);
    await settle();
    expect(a.save).not.toHaveBeenCalled();
    a.load.mockResolvedValue({ content: content.value, title: "", summary: "" });
    await handle.load();
    expect(title.value).toBe("");
    await settle();
    expect(a.save).not.toHaveBeenCalled();
    content.value = "next body";
    await settle();
    expect(a.save).toHaveBeenCalledOnce();
  });

  it("keeps the content when the stored draft is older than the saved document", async () => {
    const a = adapter();
    const old: DraftRecord = { content: "stale wombat", updatedAt: "2026-01-01T00:00:00Z" };
    a.load.mockResolvedValue(old);
    const { content, handle } = setup(a, { newerThan: "2026-02-01T00:00:00Z" });
    await handle.load();
    expect(content.value).toBe("orig");
    expect(handle.restored.value).toBe(false);
  });

  it("tells offline from a refused save and retries when the connection returns", async () => {
    const a = adapter();
    const { content, handle } = setup(a);
    await handle.load();
    a.save.mockRejectedValueOnce(new Error("refused"));
    content.value = "a";
    await settle();
    expect(handle.status.value).toBe("error");
    a.save.mockRejectedValueOnce(new OfflineError("no network"));
    content.value = "ab";
    await settle();
    expect(handle.status.value).toBe("offline");
    window.dispatchEvent(new Event("online"));
    await settle();
    expect(a.save).toHaveBeenCalledTimes(3);
    expect(a.save.mock.calls[2]![1]).toMatchObject({ content: "ab" });
    expect(handle.status.value).toBe("saved");
  });

  it("never saves blank content and removes a stored draft that became blank", async () => {
    const a = adapter();
    const { content, handle } = setup(a, { title: false, content: "" });
    await handle.load();
    content.value = "   ";
    await settle();
    expect(a.save).not.toHaveBeenCalled();
    content.value = "text";
    await settle();
    expect(a.save).toHaveBeenCalledTimes(1);
    content.value = "";
    await settle();
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(a.remove).toHaveBeenCalledWith("note:1");
  });

  it("reset replaces the value without a save", async () => {
    const a = adapter();
    const { content, handle } = setup(a, { title: false, content: "" });
    await handle.load();
    content.value = "comment text";
    await settle();
    handle.reset("");
    expect(content.value).toBe("");
    await settle();
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(handle.status.value).toBe("saved");
  });

  it("maps local history steps onto the stored cursor", async () => {
    const a = adapter();
    a.undo.mockResolvedValue({ content: "orig AAA", cursor: 0, canUndo: false, canRedo: true });
    a.redo.mockResolvedValue({ content: "orig AAA BBB", cursor: 1, canUndo: true, canRedo: false });
    const { content, handle } = setup(a, { title: false });
    await handle.load();
    content.value = "orig AAA";
    await settle();
    content.value = "orig AAA BBB";
    await settle();
    expect(a.save).toHaveBeenCalledTimes(2);

    void handle.historyStep("orig AAA");
    content.value = "orig AAA";
    await settle();
    expect(a.undo).toHaveBeenCalledTimes(1);
    expect(a.save).toHaveBeenCalledTimes(2);

    void handle.historyStep("orig AAA BBB");
    content.value = "orig AAA BBB";
    await settle();
    expect(a.redo).toHaveBeenCalledTimes(1);

    void handle.historyStep("orig AAA");
    content.value = "orig AAA";
    await settle();
    void handle.historyStep("orig");
    content.value = "orig";
    await settle();
    expect(a.save).toHaveBeenCalledTimes(3);
    expect(a.save.mock.calls[2]![1]).toMatchObject({ content: "orig" });
  });

  it("saves the text the attached editor has not emitted yet, once", async () => {
    const a = adapter();
    const { content, handle } = setup(a, { title: false });
    await handle.load();
    let unsent: string | null = null;
    handle.attach(() => {
      if (unsent !== null) content.value = unsent;
      unsent = null;
    });
    content.value = "orig wib";
    await nextTick();
    unsent = "orig wibble flonk";
    await settle();
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(a.save.mock.calls[0]![1]).toMatchObject({ content: "orig wibble flonk" });
    unsent = "orig wibble flonk zarp";
    await handle.flush();
    expect(a.save).toHaveBeenCalledTimes(2);
    expect(a.save.mock.calls[1]![1]).toMatchObject({ content: "orig wibble flonk zarp" });
  });
});

describe("server undo fall-through", () => {
  it("undoes locally first and asks the bridge once the local history is exhausted", async () => {
    vi.useRealTimers();
    const bridge: HistoryBridge & { calls: string[] } = {
      calls: [],
      canUndo: () => true,
      canRedo: () => false,
      undo: async () => void bridge.calls.push("undo"),
      redo: async () => void bridge.calls.push("redo"),
    };
    const editor = new Editor({ extensions: [Document, Paragraph, Text, UndoRedo.configure({ newGroupDelay: 0 }), ServerHistory.configure({ bridge: () => bridge })], content: "<p>otter</p>" });
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, " den");
    expect(editor.getText()).toBe("otter den");
    expect(editor.commands.historyUndo()).toBe(true);
    expect(editor.getText()).toBe("otter");
    expect(bridge.calls).toEqual([]);
    expect(editor.commands.historyUndo()).toBe(true);
    await Promise.resolve();
    expect(bridge.calls).toEqual(["undo"]);
    expect(editor.commands.historyRedo()).toBe(true);
    expect(editor.getText()).toBe("otter den");
    editor.destroy();
  });
});
