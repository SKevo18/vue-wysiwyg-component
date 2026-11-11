<script setup lang="ts">
import { computed, getCurrentInstance, inject, onBeforeUnmount, onMounted, provide, ref, shallowRef, toRaw, watch } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { createDocument, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Link as LinkIcon, Maximize2, SquareFunction } from "@lucide/vue";
import { createTranslator, hasMessage, MESSAGES, type Locale, type Messages } from "../i18n";
import { fragmentHtml, fragmentMarkdown, markdownFor } from "../markdown";
import { NO_EXTENSIONS, resolveConfig } from "../schema";
import { setKatexLoader } from "../core/math";
import type { BaseOptions, CollaborationOptions, DeepPartial, EditorExtension, EditorFormat, EditorHandle, EditorSelection, EditorServices, EditorSize, MaybeText } from "../types";
import type { DraftHandle } from "../draft/useDraft";
import { applyLink, linkAtSelection, removeLink } from "../editor/behaviour";
import { slashCatalog } from "../editor/catalog";
import { EDITOR_CONTEXT, type EditorContext } from "../editor/context";
import { convertRegistry, nodeRun, selectionRun, type BlockRun } from "../editor/convert";
import { debounced } from "../editor/debounce";
import { createFileController } from "../editor/files";
import { insertFresh } from "../editor/fresh";
import { replaceDocument, type HistoryBridge } from "../editor/history";
import { editorExtensions } from "../editor/setup";
import { WYSIWYG_DEFAULTS, useHandleRegistry } from "../plugin";
import BlockActionsMenu from "./BlockActionsMenu.vue";
import ColorTool from "./ColorTool.vue";
import FloatingToolbar from "./FloatingToolbar.vue";
import ImageLightbox from "./ImageLightbox.vue";
import LinkDialog from "./LinkDialog.vue";
import LinkHoverCard from "./LinkHoverCard.vue";
import Modal from "./Modal.vue";
import SaveStatus from "./SaveStatus.vue";
import MarkButtons from "./MarkButtons.vue";
import SourceEditor from "./SourceEditor.vue";
import TableControls from "./TableControls.vue";
import Toolbar from "./Toolbar.vue";
import { vTooltip } from "./tooltip";

defineOptions({ name: "WysiwygEditor" });

const props = withDefaults(
  defineProps<{
    modelValue: string;
    format?: EditorFormat;
    size?: EditorSize;
    /** read once at mount; nested fields inherit the surrounding editor's */
    extensions?: readonly EditorExtension[];
    base?: BaseOptions;
    placeholder?: string;
    readonly?: boolean;
    autofocus?: boolean | "start" | "end";
    services?: EditorServices;
    locale?: Locale;
    messages?: DeepPartial<Messages> & Record<string, unknown>;
    minRows?: number;
    inline?: boolean;
    expandable?: boolean;
    expandTitle?: string;
    focusMode?: boolean;
    sourceMode?: boolean;
    gutter?: boolean;
    /** ignored in collaboration mode */
    draft?: DraftHandle | null;
    /** read once at mount (remount with a `key` to switch documents): the shared document replaces modelValue, which is then only emitted */
    collaboration?: CollaborationOptions | null;
    /** tiptap key notation (`Mod-Shift-b`); the editor ignores them and emits `shortcut` */
    shortcuts?: string[];
    trailingNewline?: boolean;
    contentClass?: string;
    /** `fixed`: the toolbar above the content, plus a compact one on a text selection. `floating`: only the selection toolbar, with the turn-into menu. `both`: the two at full strength */
    toolbar?: "fixed" | "floating" | "both";
  }>(),
  {
    format: "markdown",
    size: "full",
    extensions: undefined,
    base: undefined,
    placeholder: undefined,
    readonly: false,
    autofocus: false,
    services: undefined,
    locale: undefined,
    messages: undefined,
    minRows: 3,
    inline: false,
    expandable: true,
    expandTitle: undefined,
    focusMode: false,
    sourceMode: false,
    gutter: true,
    draft: null,
    collaboration: null,
    shortcuts: () => [],
    trailingNewline: undefined,
    contentClass: "",
    toolbar: "fixed",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  submit: [];
  save: [];
  shortcut: [key: string];
  pending: [value: boolean];
  ready: [handle: EditorHandle];
}>();

const parent = inject(EDITOR_CONTEXT, null);
const defaults = inject(WYSIWYG_DEFAULTS, {});
const inherited = parent?.inherit ?? defaults;
const extensions = props.extensions ?? inherited.extensions ?? defaults.extensions ?? NO_EXTENSIONS;
const base = props.base ?? inherited.base ?? defaults.base;
const services: EditorServices = props.services ?? inherited.services ?? defaults.services ?? {};
const locale: Locale = props.locale ?? inherited.locale ?? defaults.locale ?? "en";
const overrides = props.messages ?? inherited.messages ?? defaults.messages;
setKatexLoader(services.katex);
// a reactive proxy would hide the Y.Doc's own identity checks from yjs
const shared = toRaw(props.collaboration)?.extensions ?? null;
const activeDraft = computed(() => (shared ? null : props.draft));

const config = resolveConfig(props.format, base, extensions);
const markdown = markdownFor(config);
const html = props.format === "html";
const full = props.size === "full";
const isInline = props.inline && !full;
const trailing = props.trailingNewline ?? full;
const trees = [overrides, ...config.extensions.map((e) => e.messages?.[locale]), ...config.extensions.map((e) => e.messages?.en), MESSAGES[locale], MESSAGES.en];
const t = createTranslator(trees);
const has = (key: string) => hasMessage(trees, key);
const text = (label: MaybeText | undefined, key?: string) => {
  const v = typeof label === "function" ? label() : label;
  return v || (key && has(key) ? t(key) : "");
};
const instance = getCurrentInstance()!;
const listens = (name: string) => !!instance.vnode.props?.[`on${name[0]!.toUpperCase()}${name.slice(1)}`];

const uploads = ref({ count: 0, fraction: null as number | null });
const files = createFileController({ editor: () => editor.value, config, services, t, locale, progress: (count, fraction) => (uploads.value = { count, fraction }) });
onBeforeUnmount(() => files.dispose());

const ctx: EditorContext = {
  config,
  markdown,
  convert: convertRegistry(config, markdown),
  services,
  t,
  locale,
  size: props.size,
  inline: isInline,
  slashItems: [],
  toolbar: config.extensions.flatMap((e) => e.toolbar ?? []).sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)),
  bubble: config.extensions.flatMap((e) => e.bubble ?? []).sort((a, b) => (a.rank ?? 100) - (b.rank ?? 100)),
  codeBlock: config.extensions.flatMap((e) => (e.codeBlock ? [e.codeBlock] : [])),
  figure: config.extensions.flatMap((e) => (e.figure ? [e.figure] : [])),
  math: config.extensions.flatMap((e) => (e.math ? [e.math] : [])),
  files,
  text,
  has,
  field: instance.type,
  inherit: { extensions, base, services, locale, messages: overrides },
  zoom: (image) => (zoomed.value = image),
};
ctx.slashItems = isInline ? [] : slashCatalog(config, files, services, text);
provide(EDITOR_CONTEXT, ctx);
const readonlyBubble = ctx.bubble.some((item) => item.readonly);
const zoomed = ref<{ src: string; alt: string } | null>(null);
const floatingBar = ref<InstanceType<typeof FloatingToolbar> | null>(null);

const root = ref<HTMLElement | null>(null);
const mode = ref<"visual" | "source">("visual");
const fullscreen = ref(false);
const focused = ref(false);
const expanded = ref(false);
const tick = ref(0);
const linkOpen = ref(false);
const linkInitial = ref({ href: "", text: "", hasLink: false });
let lastEmitted = props.modelValue;
let unsent = false;

const idle = debounced(() => void flush(), 250, 2000);
const deferred = full && !html;

function parse(e: Editor, value: string, from: EditorFormat = props.format): PMNode {
  if (from === "html") return createDocument(value, e.schema, { preserveWhitespace: false });
  return isInline ? markdown.parseInline(value, e.schema) : markdown.parse(value, e.schema);
}

function serialize(e: Editor, as: EditorFormat | "text" = props.format): string {
  const doc = e.state.doc;
  if (as === "text") return doc.textBetween(0, doc.content.size, "\n\n", "\n");
  if (as === "html") return e.isEmpty ? "" : e.getHTML();
  if (isInline) return markdown.serializeInline(doc);
  const md = markdown.serialize(doc);
  if (md === "\n") return "";
  return trailing ? md : md.replace(/\n$/, "");
}

/** with `history` it is one local undo step (AI edits), otherwise it stays out of the history */
function load(e: Editor, value: string, history = false) {
  setUnsent(false);
  try {
    const doc = parse(e, value);
    if (history) e.commands.setContent(doc.toJSON(), { emitUpdate: false });
    else replaceDocument(e, doc);
  } catch {
    if (!html && full) {
      services.toast?.(t("editor.parseFailed"), "error");
      mode.value = "source";
    } else {
      e.commands.setContent(value, { emitUpdate: false });
    }
  }
}

function setUnsent(v: boolean) {
  if (unsent === v) return;
  unsent = v;
  activeDraft.value?.pending(v);
  emit("pending", v);
}

function flush(history = false): string | null {
  idle.cancel();
  const e = editor.value;
  let value: string | null = null;
  if ((unsent || history) && e && mode.value === "visual") {
    value = serialize(e);
    if (value !== lastEmitted) {
      lastEmitted = value;
      if (history && activeDraft.value) void activeDraft.value.historyStep(value);
      emit("update:modelValue", value);
    }
  }
  setUnsent(false);
  return value;
}

function bridge(): HistoryBridge | null {
  const draft = activeDraft.value;
  if (!draft) return null;
  const apply = (value: string | null) => {
    const e = editor.value;
    if (value === null || value === lastEmitted || !e) return;
    lastEmitted = value;
    if (mode.value === "visual") load(e, value);
  };
  return {
    canUndo: () => draft.canUndo.value,
    canRedo: () => draft.canRedo.value,
    undo: async () => apply(await draft.undo()),
    redo: async () => apply(await draft.redo()),
  };
}

function hostKeys(): Record<string, () => boolean> {
  const keys: Record<string, () => boolean> = {};
  if (listens("submit")) {
    keys["Mod-Enter"] = () => {
      flush();
      emit("submit");
      return true;
    };
  }
  keys["Mod-s"] = () => {
    if (!listens("save")) return false;
    flush();
    emit("save");
    return true;
  };
  // an empty caret outside a link leaves Mod-k to the host (its search)
  keys["Mod-k"] = () => {
    const e = editor.value;
    if (!config.base.links || !e || (e.state.selection.empty && !e.isActive("link"))) return false;
    openLink();
    return true;
  };
  keys["Alt-F10"] = () => floatingBar.value?.focusFirst() ?? false;
  for (const k of props.shortcuts) {
    keys[k] = () => {
      emit("shortcut", k);
      return true;
    };
  }
  return keys;
}

const blockMenu = shallowRef<{ run: BlockRun; anchor: HTMLElement; convertOnly: boolean; selectAll: boolean } | null>(null);
const menuAnchor = ref<HTMLElement | null>(null);

function anchorAt(rect: { left: number; top: number; bottom: number }): HTMLElement | null {
  const el = menuAnchor.value;
  const box = el?.parentElement?.getBoundingClientRect();
  if (!el || !box) return null;
  el.style.left = `${rect.left - box.left}px`;
  el.style.top = `${rect.top - box.top}px`;
  el.style.height = `${rect.bottom - rect.top}px`;
  return el;
}

function openGripMenu(pos: number, grip: HTMLElement) {
  const e = editor.value;
  if (blockMenu.value?.anchor === grip && blockMenu.value.run.from === pos) {
    blockMenu.value = null;
    return;
  }
  const run = e && nodeRun(e.state, pos);
  blockMenu.value = run ? { run, anchor: grip, convertOnly: false, selectAll: false } : null;
}

function openCaretMenu(button?: HTMLElement) {
  if (button && blockMenu.value?.anchor === button) {
    blockMenu.value = null;
    return;
  }
  const e = editor.value;
  const run = e && selectionRun(e.state);
  const anchor = button ?? (e && anchorAt(e.view.coordsAtPos(e.state.selection.from)));
  blockMenu.value = run && anchor ? { run, anchor, convertOnly: false, selectAll: !e.state.selection.empty } : null;
}

function openConvertMenu(button: HTMLElement) {
  const e = editor.value;
  const run = e && selectionRun(e.state);
  const anchor = anchorAt(button.getBoundingClientRect());
  blockMenu.value = run && anchor ? { run, anchor, convertOnly: true, selectAll: true } : null;
}

function insertAfter(pos: number) {
  editor.value?.chain().focus().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).insertContent("/").run();
}

const editor = useEditor({
  editable: !props.readonly,
  extensions: editorExtensions(ctx, {
    placeholder: props.placeholder ?? (isInline ? "" : t("editor.placeholder")),
    gutter: full && props.gutter ? { onInsertAfter: insertAfter, onMenu: openGripMenu, menuOpen: () => blockMenu.value !== null } : null,
    bridge,
    hostKeys,
    collaboration: shared,
  }),
  editorProps: {
    attributes: { class: `wy-prose wy-content${isInline ? " is-inline" : ""}${props.contentClass ? ` ${props.contentClass}` : ""}`, spellcheck: "true" },
    handlePaste: (_view, event) => !isInline && !!event.clipboardData?.files.length && files.insert(Array.from(event.clipboardData.files), null),
    handleDrop: (view, event, _slice, moved) => {
      if (isInline || moved || !event.dataTransfer?.files.length) return false;
      return files.insert(Array.from(event.dataTransfer.files), view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null);
    },
  },
  onCreate: ({ editor: e }) => {
    if (!shared) load(e, props.modelValue);
    lastEmitted = props.modelValue;
    if (props.autofocus) e.commands.focus(props.autofocus === "start" ? "start" : "end");
    emit("ready", handle);
  },
  onUpdate: ({ transaction }) => {
    if (transaction.getMeta("history$")) {
      flush(true);
      return;
    }
    setUnsent(true);
    if (deferred) idle.schedule();
    else flush();
  },
  onFocus: ({ event }) => {
    focused.value = true;
    registry?.activate(handle);
    emit("focus", event);
  },
  onBlur: ({ editor: e, event }) => {
    flush();
    if (!root.value?.contains(event.relatedTarget as Node | null)) focused.value = false;
    const sel = e.state.selection;
    if (sel instanceof NodeSelection && sel.node.isInline) e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, sel.to)));
    emit("blur", event);
  },
  onTransaction: ({ transaction }) => {
    tick.value++;
    if (transaction.docChanged) blockMenu.value = null;
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (shared || mode.value === "source" || value === lastEmitted || !editor.value) return;
    lastEmitted = value;
    load(editor.value, value);
  },
);
watch(
  () => props.readonly,
  (ro) => editor.value?.setEditable(!ro),
);

let detach: (() => void) | null = null;
watch(
  () => activeDraft.value,
  (d) => {
    detach?.();
    detach = d ? d.attach(() => void flush()) : null;
  },
  { immediate: true },
);
// registered before useEditor's own hook destroys the editor
onBeforeUnmount(() => {
  flush();
  detach?.();
});

function setMode(next: "visual" | "source") {
  if (next === mode.value) return;
  flush();
  blockMenu.value = null;
  if (next === "visual" && editor.value) {
    lastEmitted = props.modelValue;
    load(editor.value, props.modelValue);
    editor.value.commands.focus();
  }
  mode.value = next;
}

function onSourceInput(value: string) {
  lastEmitted = value;
  emit("update:modelValue", value);
}

let bodyOverflow = "";
function setFullscreen(on: boolean) {
  fullscreen.value = on;
  if (on) bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = on ? "hidden" : bodyOverflow;
  if (on && mode.value === "visual") editor.value?.commands.focus();
}

// runs after prosemirror, which prevents the default of every key it handles (its shortcuts, Mod-k, Enter …).
// those keys stay in the editor, so a host's own shortcut for the same key (a global Mod-k search) does not fire too
function onKeydown(e: KeyboardEvent) {
  if (!editor.value?.view.dom.contains(e.target as Node)) return;
  const mod = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey;
  if (mod && e.key === "/" && full) {
    e.preventDefault();
    openCaretMenu();
  }
  if (e.defaultPrevented) e.stopPropagation();
}

// capture: prosemirror swallows Escape. a block edited in place and an open menu keep their own Esc
function onEscape(e: KeyboardEvent) {
  if (e.key !== "Escape" || !fullscreen.value) return;
  const target = e.target as Element | null;
  if (target?.closest(".wy-block-frame.is-editing") || root.value?.querySelector('[aria-expanded="true"]')) return;
  e.preventDefault();
  e.stopPropagation();
  setFullscreen(false);
}

onBeforeUnmount(() => {
  if (fullscreen.value) document.body.style.overflow = bodyOverflow;
});

function openLink() {
  const e = editor.value;
  if (!e) return;
  linkInitial.value = linkAtSelection(e);
  linkOpen.value = true;
}

function onApplyLink(href: string, label: string) {
  linkOpen.value = false;
  if (editor.value) applyLink(editor.value, href, label);
}

function onRemoveLink() {
  linkOpen.value = false;
  if (editor.value) removeLink(editor.value);
}

const linkActive = computed(() => {
  void tick.value;
  return !!editor.value?.isActive("link");
});

const minHeight = computed(() => (isInline || full ? undefined : `${Math.max(1, props.minRows) * 1.6 + 1}rem`));

function toMath() {
  const e = editor.value;
  if (!e) return;
  const { from, to } = e.state.selection;
  insertFresh(e, "mathInline", { tex: e.state.doc.textBetween(from, to, " ").trim() }, { from, to });
}

function onExpandedInput(value: string) {
  if (value === lastEmitted) return;
  lastEmitted = value;
  emit("update:modelValue", value);
  if (editor.value) load(editor.value, value);
}

function onFieldMouseDown(e: MouseEvent) {
  if (e.target === e.currentTarget && editor.value && !props.readonly) {
    e.preventDefault();
    editor.value.commands.focus("end");
  }
}

const draftStatus = computed(() => activeDraft.value?.status.value ?? "none");

function selectionAs(e: Editor): EditorSelection {
  const { from, to, empty } = e.state.selection;
  const fragment = e.state.selection.content().content;
  const text = e.state.doc.textBetween(from, to, "\n");
  let md = "";
  try {
    md = empty ? "" : fragmentMarkdown(markdown, fragment, e.schema);
  } catch {
    md = text;
  }
  return { empty, from, to, text, markdown: md, html: fragmentHtml(fragment, e.schema) };
}

const handle: EditorHandle = {
  get editor() {
    return editor.value ?? null;
  },
  format: props.format,
  getContent(as = props.format) {
    const fresh = flush();
    const e = editor.value;
    if (mode.value === "source" || !e) return props.modelValue;
    if (as === props.format) return fresh ?? serialize(e);
    return serialize(e, as);
  },
  setContent(value, opts = {}) {
    const e = editor.value;
    const from = opts.format ?? props.format;
    if (!e || mode.value === "source") {
      if (from === props.format) onSourceInput(value);
      return;
    }
    const doc = from === props.format ? null : parse(e, value, from);
    if (doc) {
      if (opts.undoable) e.commands.setContent(doc.toJSON());
      else replaceDocument(e, doc);
      setUnsent(true);
      flush();
      return;
    }
    lastEmitted = value;
    emit("update:modelValue", value);
    load(e, value, opts.undoable);
  },
  insertAtCursor(value, opts = {}) {
    const e = editor.value;
    const from = opts.format ?? props.format;
    if (!e || mode.value === "source") {
      if (!html) onSourceInput(props.modelValue.replace(/\s*$/, "") + "\n\n" + value.trim() + "\n");
      return;
    }
    const doc = parse(e, value, from);
    e.chain().focus().insertContent(isInline ? (doc.firstChild?.content.toJSON() ?? []) : doc.content.toJSON()).run();
  },
  getSelection() {
    const e = editor.value;
    return e ? selectionAs(e) : { empty: true, from: 0, to: 0, text: "", markdown: "", html: "" };
  },
  focus(where = "end") {
    editor.value?.commands.focus(where);
  },
  isEmpty() {
    const e = editor.value;
    return e ? e.isEmpty : !props.modelValue.trim();
  },
  flush() {
    flush();
  },
};

const registry = parent ? null : useHandleRegistry();
let unregister: (() => void) | null = null;
onMounted(() => {
  unregister = registry?.register(handle) ?? null;
});
onBeforeUnmount(() => unregister?.());

defineExpose(handle);
</script>

<template>
  <div
    ref="root"
    class="wy-editor"
    :class="[`is-${size}`, `is-${format}`, { 'is-fullscreen': fullscreen, 'is-focused': focused, 'is-readonly': readonly, 'is-inline': isInline }]"
    :style="{ minHeight }"
    @keydown="onKeydown"
    @keydown.capture="onEscape"
  >
    <template v-if="full">
      <slot name="header" />
      <Toolbar
        v-if="editor && !readonly && toolbar !== 'floating'"
        :editor="editor"
        :tick="tick"
        :mode="mode"
        :fullscreen="fullscreen"
        :block-menu-open="!!blockMenu && !blockMenu.convertOnly"
        :show-focus="focusMode"
        :show-source="sourceMode && !html && !shared"
        :server-undo="activeDraft?.canUndo.value ?? false"
        :server-redo="activeDraft?.canRedo.value ?? false"
        @link="openLink"
        @block-menu="openCaretMenu"
        @toggle-fullscreen="setFullscreen(!fullscreen)"
        @set-mode="setMode"
      >
        <template #status>
          <slot name="status"><SaveStatus v-if="activeDraft" :status="draftStatus" /></slot>
        </template>
        <template v-if="$slots.actions" #actions><slot name="actions" /></template>
      </Toolbar>
      <div v-show="mode === 'visual'" class="wy-surface" :class="{ 'has-gutter': gutter && !readonly }">
        <EditorContent :editor="editor" class="wy-host" />
        <FloatingToolbar v-if="editor && (!readonly || readonlyBubble)" ref="floatingBar" v-show="mode === 'visual'" :editor="editor" :tick="tick" :readonly="readonly" :full="toolbar !== 'fixed'" @link="openLink" @convert="openConvertMenu" />
        <LinkHoverCard v-if="editor && config.base.links && mode === 'visual'" :editor="editor" :tick="tick" :readonly="readonly" :focused="focused" @edit="openLink" />
        <TableControls v-if="editor && !readonly && config.base.tables" :editor="editor" :tick="tick" />
        <span ref="menuAnchor" class="wy-menu-anchor" aria-hidden="true"></span>
        <BlockActionsMenu
          v-if="editor && blockMenu"
          :key="`${blockMenu.run.from}-${blockMenu.convertOnly}`"
          :editor="editor"
          :run="blockMenu.run"
          :anchor="blockMenu.anchor"
          :convert-only="blockMenu.convertOnly"
          :select-all="blockMenu.selectAll"
          @close="blockMenu = null"
        />
      </div>
      <div v-if="mode === 'source'" class="wy-surface wy-source">
        <component :is="services.sourceEditor ?? SourceEditor" :model-value="modelValue" :aria-label="t('source.label')" @update:model-value="onSourceInput" />
      </div>
      <div v-if="uploads.count" class="wy-statusbar" role="status">{{ uploads.fraction === null ? t("editor.uploading", { n: uploads.count }) : t("editor.uploadingProgress", { n: uploads.count, percent: Math.round(uploads.fraction * 100) }) }}</div>
      <slot name="footer" />
    </template>

    <template v-else>
      <div class="wy-field-body" @mousedown="onFieldMouseDown">
        <EditorContent :editor="editor" class="wy-host" />
      </div>
      <div v-show="focused && !readonly && toolbar !== 'floating'" class="wy-field-tools" role="toolbar" :aria-label="t('field.tools')" @mousedown.prevent>
        <MarkButtons v-if="editor" :editor="editor" :tick="tick" small />
        <ColorTool v-if="editor && (config.base.color || config.base.highlight)" :editor="editor" :tick="tick" small />
        <button v-if="config.base.links" v-tooltip="{ text: t('toolbar.link'), keys: 'Mod-k' }" type="button" class="wy-tool is-sm" :aria-label="t('toolbar.link')" :aria-pressed="linkActive" @click="openLink"><LinkIcon :size="15" /></button>
        <button v-if="config.base.math" v-tooltip="t('slash.items.mathInline.label')" type="button" class="wy-tool is-sm" :aria-label="t('slash.items.mathInline.label')" @click="toMath"><SquareFunction :size="15" /></button>
        <button v-if="expandable && !isInline && !shared" v-tooltip="t('field.expand')" type="button" class="wy-tool is-sm" :aria-label="t('field.expand')" @click="expanded = true"><Maximize2 :size="15" /></button>
      </div>
      <FloatingToolbar v-if="editor && toolbar !== 'fixed' && (!readonly || readonlyBubble)" ref="floatingBar" :editor="editor" :tick="tick" :readonly="readonly" :full="false" @link="openLink" />
      <LinkHoverCard v-if="editor && config.base.links" :editor="editor" :tick="tick" :readonly="readonly" :focused="focused" @edit="openLink" />
      <SaveStatus v-if="activeDraft" class="wy-field-status" :status="draftStatus" dot />
      <Modal v-if="!isInline && !shared" :open="expanded" size="lg" :title="expandTitle ?? t('field.expandTitle')" :close-label="t('field.close')" @close="expanded = false">
        <WysiwygEditor
          v-if="expanded"
          :model-value="modelValue"
          :format="format"
          size="full"
          :extensions="extensions"
          :base="base"
          :services="services"
          :locale="locale"
          :messages="overrides"
          :draft="activeDraft"
          :trailing-newline="trailing"
          :placeholder="placeholder"
          :toolbar="toolbar"
          autofocus="end"
          @update:model-value="onExpandedInput"
        />
      </Modal>
    </template>

    <LinkDialog :open="linkOpen" :href="linkInitial.href" :text="linkInitial.text" :has-link="linkInitial.hasLink" @close="linkOpen = false" @apply="onApplyLink" @remove="onRemoveLink" />
    <ImageLightbox :image="zoomed" :close-label="t('dialog.close')" @close="zoomed = null" />
  </div>
</template>
