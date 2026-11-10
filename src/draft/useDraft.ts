// the editor keeps its own local history; local undo/redo steps are mapped onto the storage cursor so undone states
// never become new entries: a step that lands on the previous/next known entry calls adapter undo/redo, anything
// else is a normal save (dropping the entries after the cursor). once the local history is exhausted the editor
// calls `undo`/`redo`, which step the stored history.
// nothing is saved while content, title and summary are all blank and no draft exists; an existing draft that became
// blank is removed.
import { computed, getCurrentScope, onScopeDispose, ref, unref, watch, type MaybeRef, type Ref } from "vue";

export interface DraftRecord {
  content: string;
  title?: string;
  summary?: string;
  baseRevision?: string | number | null;
  /** iso string or epoch ms */
  updatedAt?: string | number | null;
  cursor?: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

export interface DraftCursor {
  cursor: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface DraftStep extends DraftCursor {
  content: string;
}

export interface DraftAdapter {
  load(scope: string): Promise<DraftRecord | null>;
  save(scope: string, draft: { content: string; title?: string; summary?: string; baseRevision?: string | number | null }): Promise<DraftCursor | void>;
  remove(scope: string): Promise<void>;
  undo?(scope: string): Promise<DraftStep | null>;
  redo?(scope: string): Promise<DraftStep | null>;
  /** true when an error means the network is down (status `offline`) rather than a refused save (`error`) */
  isOffline?(error: unknown): boolean;
}

export type DraftStatus = "none" | "idle" | "saving" | "saved" | "offline" | "error";

export interface DraftOptions {
  scope: MaybeRef<string | null>;
  content: Ref<string>;
  title?: Ref<string>;
  summary?: Ref<string>;
  baseRevision?: Ref<string | number | null>;
  /** ms, default 500 */
  delay?: number;
  newerThan?: MaybeRef<string | number | Date | null | undefined>;
  /** whether a loaded draft that differs from the content replaces it; default: when it is newer */
  onRestore?: (draft: DraftRecord) => boolean | Promise<boolean>;
}

export interface DraftHandle {
  status: Readonly<Ref<DraftStatus>>;
  canUndo: Readonly<Ref<boolean>>;
  canRedo: Readonly<Ref<boolean>>;
  restored: Ref<boolean>;
  flush(): Promise<void>;
  undo(): Promise<string | null>;
  redo(): Promise<string | null>;
  historyStep(content: string): Promise<void>;
  discard(): Promise<void>;
  load(): Promise<DraftRecord | null>;
  reset(content: string): void;
  attach(flush: () => void): () => void;
  pending(on: boolean): void;
}

function time(v: string | number | Date | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
}

export function useDraft(adapter: DraftAdapter, opts: DraftOptions): DraftHandle {
  const status = ref<DraftStatus>("none");
  const canUndo = ref(false);
  const canRedo = ref(false);
  const restored = ref(false);
  const delay = opts.delay ?? 500;
  const scope = computed(() => unref(opts.scope));
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSent = "";
  let suppressNext = false;
  let inflight: Promise<void> | null = null;
  // nothing is saved before load() has seen the stored draft
  let ready = false;
  let gen = 0;
  let exists = false;
  let cursor = -1;
  const known = new Map<number, string>();
  let source: (() => void) | null = null;
  const editorPending = ref(false);
  const shown = computed<DraftStatus>(() => (editorPending.value && status.value === "saved" ? "idle" : status.value));

  const snapshot = () => JSON.stringify([opts.content.value, opts.title?.value ?? "", opts.summary?.value ?? ""]);

  function applyCursor(s: DraftCursor | DraftRecord | void | null) {
    if (!s || s.cursor === undefined) return;
    cursor = s.cursor;
    canUndo.value = !!s.canUndo && !!adapter.undo;
    canRedo.value = !!s.canRedo && !!adapter.redo;
  }

  function forget() {
    exists = false;
    cursor = -1;
    known.clear();
    canUndo.value = false;
    canRedo.value = false;
    restored.value = false;
  }

  function cancelTimer() {
    clearTimeout(timer ?? undefined);
    timer = null;
  }

  function pull(): boolean {
    const before = opts.content.value;
    source?.();
    const changed = opts.content.value !== before;
    if (changed && ready) suppressNext = true;
    return changed;
  }

  function failed(e: unknown) {
    const offline = adapter.isOffline ? adapter.isOffline(e) : typeof navigator !== "undefined" && !navigator.onLine;
    status.value = offline || (typeof navigator !== "undefined" && !navigator.onLine) ? "offline" : "error";
  }

  async function push(): Promise<void> {
    const s = scope.value;
    if (!s) return;
    pull();
    const sent = snapshot();
    if (sent === lastSent) {
      if (status.value !== "offline" && status.value !== "error") status.value = "saved";
      return;
    }
    const g = gen;
    if (!opts.content.value.trim() && !opts.title?.value.trim() && !opts.summary?.value.trim()) {
      if (!exists) {
        lastSent = sent;
        status.value = "saved";
        return;
      }
      status.value = "saving";
      try {
        await adapter.remove(s);
        if (g !== gen) return;
        forget();
        lastSent = sent;
        status.value = "saved";
      } catch (e) {
        if (g === gen) failed(e);
      }
      return;
    }
    status.value = "saving";
    const content = opts.content.value;
    try {
      const state = await adapter.save(s, { content, title: opts.title?.value, summary: opts.summary?.value, baseRevision: opts.baseRevision?.value ?? null });
      if (g !== gen) return;
      exists = true;
      lastSent = sent;
      if (state) {
        for (const k of known.keys()) if (k >= state.cursor) known.delete(k);
        known.set(state.cursor, content);
        applyCursor(state);
      }
      status.value = sent === snapshot() ? "saved" : "idle";
    } catch (e) {
      if (g === gen) failed(e);
    }
  }

  function queue() {
    if (status.value !== "offline" || typeof navigator === "undefined" || navigator.onLine) status.value = "idle";
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      inflight = push().finally(() => (inflight = null));
    }, delay);
  }

  function schedule() {
    if (!scope.value || !ready) return;
    if (suppressNext) {
      suppressNext = false;
      return;
    }
    queue();
  }

  async function flush() {
    cancelTimer();
    if (inflight) await inflight;
    await push();
  }

  async function shouldRestore(d: DraftRecord): Promise<boolean> {
    if (opts.onRestore) return opts.onRestore(d);
    const after = time(unref(opts.newerThan));
    const at = time(d.updatedAt);
    return after === null || at === null || at > after;
  }

  async function load(): Promise<DraftRecord | null> {
    const s = scope.value;
    if (!s) {
      status.value = "none";
      return null;
    }
    ready = true;
    const before = snapshot();
    try {
      const draft = await adapter.load(s);
      if (scope.value !== s) return null;
      if (!draft) {
        exists = false;
        lastSent = before;
        status.value = "saved";
        if (snapshot() !== before) queue();
        return null;
      }
      exists = true;
      known.clear();
      if (draft.cursor !== undefined) known.set(draft.cursor, draft.content);
      applyCursor(draft);
      const changed = draft.content !== opts.content.value || (opts.title && draft.title !== undefined && draft.title !== opts.title.value) || (opts.summary && draft.summary !== undefined && draft.summary !== opts.summary.value);
      if (changed && (await shouldRestore(draft))) {
        if (scope.value !== s) return null;
        suppressNext = true;
        opts.content.value = draft.content;
        if (opts.baseRevision && draft.baseRevision !== null && draft.baseRevision !== undefined) opts.baseRevision.value = draft.baseRevision;
        if (opts.title && draft.title !== undefined) opts.title.value = draft.title;
        if (opts.summary && draft.summary !== undefined) opts.summary.value = draft.summary;
        lastSent = snapshot();
        restored.value = true;
      } else {
        lastSent = draft.content === opts.content.value ? JSON.stringify([draft.content, draft.title ?? "", draft.summary ?? ""]) : "";
      }
      status.value = "saved";
      return draft;
    } catch (e) {
      if (scope.value === s) failed(e);
      return null;
    }
  }

  async function request(dir: "undo" | "redo"): Promise<DraftStep | null> {
    const s = scope.value;
    const fn = dir === "undo" ? adapter.undo : adapter.redo;
    if (!s || !fn) return null;
    const g = gen;
    try {
      const res = await fn.call(adapter, s);
      if (!res || scope.value !== s || g !== gen) return null;
      applyCursor(res);
      known.set(res.cursor, res.content);
      return res;
    } catch {
      return null;
    }
  }

  async function step(dir: "undo" | "redo"): Promise<string | null> {
    if (!scope.value) return null;
    await flush();
    if (dir === "undo" ? !canUndo.value : !canRedo.value) return null;
    const res = await request(dir);
    if (!res) return null;
    if (res.content !== opts.content.value) suppressNext = true;
    opts.content.value = res.content;
    lastSent = snapshot();
    status.value = "saved";
    return res.content;
  }

  async function historyStep(content: string): Promise<void> {
    const s = scope.value;
    if (!ready || !s) return;
    if (opts.content.value !== content) suppressNext = true;
    cancelTimer();
    if (inflight) await inflight;
    if (scope.value !== s) return;
    const dir = adapter.undo && known.get(cursor - 1) === content ? "undo" : adapter.redo && known.get(cursor + 1) === content ? "redo" : null;
    if (!dir) {
      queue();
      return;
    }
    status.value = "saving";
    const res = await request(dir);
    if (!res) {
      queue();
      return;
    }
    lastSent = JSON.stringify([res.content, opts.title?.value ?? "", opts.summary?.value ?? ""]);
    if (snapshot() !== lastSent) queue();
    else if (!timer) status.value = "saved";
  }

  async function discard() {
    cancelTimer();
    const s = scope.value;
    if (!s) return;
    if (inflight) await inflight;
    gen++;
    try {
      await adapter.remove(s);
    } catch {
    }
    if (scope.value !== s) return;
    forget();
    lastSent = snapshot();
    status.value = "saved";
  }

  function reset(content: string) {
    cancelTimer();
    const s = scope.value;
    const pending = inflight;
    gen++;
    // a save still running recreates the draft after the host committed it; remove it once it lands
    if (pending && s) void pending.then(() => adapter.remove(s)).catch(() => undefined);
    if (opts.content.value !== content && s && ready) suppressNext = true;
    opts.content.value = content;
    forget();
    lastSent = snapshot();
    status.value = s ? "saved" : "none";
  }

  function attach(flushEditor: () => void) {
    source = flushEditor;
    return () => {
      if (source !== flushEditor) return;
      source = null;
      editorPending.value = false;
    };
  }

  watch(opts.content, schedule);
  if (opts.title) watch(opts.title, schedule);
  if (opts.summary) watch(opts.summary, schedule);
  watch(
    scope,
    (s, old) => {
      if (old !== undefined) {
        cancelTimer();
        gen++;
        ready = false;
        suppressNext = false;
        lastSent = "";
        forget();
      }
      status.value = s ? "saved" : "none";
    },
    { immediate: true },
  );

  function onOffline() {
    if (scope.value) status.value = "offline";
  }
  function onOnline() {
    if (scope.value && ready && (status.value === "offline" || status.value === "error")) queue();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
  }
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      }
      if ((pull() && ready) || timer) {
        cancelTimer();
        void push();
      }
    });
  }

  return {
    status: shown,
    canUndo,
    canRedo,
    restored,
    flush,
    undo: () => step("undo"),
    redo: () => step("redo"),
    historyStep,
    discard,
    load,
    reset,
    attach,
    pending: (on: boolean) => void (editorPending.value = on),
  };
}
