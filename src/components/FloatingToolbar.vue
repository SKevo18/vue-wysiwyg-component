<script setup lang="ts">
// shown on a text selection. `full` adds the turn-into menu; a readonly editor only offers the host tools marked
// readonly (e.g. commenting on a selection). Alt+F10 in the editor moves focus here, Esc returns it.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/vue-3/menus";
import { ChevronDown, Link as LinkIcon, Sparkles, SquareFunction } from "@lucide/vue";
import { tokenCss } from "../core/colors";
import { useEditorContext } from "../editor/context";
import { runTargets, selectionRun } from "../editor/convert";
import { insertFresh } from "../editor/fresh";
import { fragmentHtml, fragmentMarkdown } from "../markdown";
import Dropdown from "./Dropdown.vue";
import ColorMenu from "./ColorMenu.vue";
import MarkButtons from "./MarkButtons.vue";
import { vTooltip } from "./tooltip";

const props = defineProps<{ editor: Editor; tick: number; readonly?: boolean; full?: boolean }>();
const emit = defineEmits<{ link: []; convert: [button: HTMLElement] }>();
const ctx = useEditorContext();
const t = ctx.t;
const b = ctx.config.base;
const html = ctx.config.format === "html";
const CONTEXT_CHARS = 600;
const bar = ref<HTMLElement | null>(null);
const tools = computed(() => (props.readonly ? ctx.bubble.filter((item) => item.readonly) : ctx.bubble));
const colors = b.color || b.highlight;

const LIST_LABELS: Record<string, string> = { bulletList: "bulletList", orderedList: "orderedList", taskList: "taskList" };

function blockLabel(e: Editor): string {
  const $from = e.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    const name = n.type.name;
    if (name === "heading") return t("toolbar.heading", { n: n.attrs.level as number });
    if (name === "codeBlock") return t("toolbar.codeBlock");
    if (name === "listItem" || name === "taskItem") {
      const list = LIST_LABELS[$from.node(d - 1).type.name];
      if (list) return t(`toolbar.${list}`);
    }
    if (name === "blockquote") return t("toolbar.quote");
    if (name === "callout") return t("toolbar.callout");
    if (name !== "paragraph") {
      const label = ctx.text("", `slash.items.${name}.label`);
      if (label) return label;
    }
  }
  return t("toolbar.paragraph");
}

const state = computed(() => {
  void props.tick;
  const e = props.editor;
  const run = !props.full || e.state.selection.empty || ctx.inline ? null : selectionRun(e.state);
  const convert = !!run && runTargets(ctx.convert, e.state, run).length > 0;
  return {
    link: e.isActive("link"),
    color: String(e.getAttributes("textStyle").color ?? ""),
    mark: String(e.getAttributes("highlight").color ?? ""),
    convert,
    block: convert ? blockLabel(e) : "",
  };
});

function shouldShow({ editor: e, from, to }: { editor: Editor; from: number; to: number }): boolean {
  if (from === to || (!e.isEditable && !tools.value.length)) return false;
  if (e.state.selection instanceof NodeSelection || e.state.selection instanceof CellSelection) return false;
  if (e.isActive("codeBlock")) return false;
  return e.state.doc.textBetween(from, to, " ").trim().length > 0;
}

function toMath() {
  const e = props.editor;
  const { from, to } = e.state.selection;
  insertFresh(e, "mathInline", { tex: e.state.doc.textBetween(from, to, " ").trim() }, { from, to });
}

function askAi() {
  const { doc, selection } = props.editor.state;
  const { from, to } = selection;
  const fragment = selection.content().content;
  const text = doc.textBetween(from, to, "\n");
  let content = text;
  try {
    content = html ? fragmentHtml(fragment, doc.type.schema) : fragmentMarkdown(ctx.markdown, fragment, doc.type.schema);
  } catch {
  }
  ctx.services.askAi?.({
    selection: text,
    content,
    before: doc.textBetween(Math.max(0, from - 4 * CONTEXT_CHARS), from, "\n").slice(-CONTEXT_CHARS),
    after: doc.textBetween(to, Math.min(doc.content.size, to + 4 * CONTEXT_CHARS), "\n").slice(0, CONTEXT_CHARS),
  });
}

function buttons(): HTMLElement[] {
  return [...(bar.value?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])];
}

function onKeydown(e: KeyboardEvent) {
  const list = buttons();
  const i = list.indexOf(document.activeElement as HTMLElement);
  let next = -1;
  if (e.key === "ArrowRight") next = (i + 1) % list.length;
  else if (e.key === "ArrowLeft") next = (i - 1 + list.length) % list.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = list.length - 1;
  else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    props.editor.view.focus();
    return;
  }
  if (next < 0 || !list.length) return;
  e.preventDefault();
  list[next]!.focus();
}

/** for Alt+F10 in the editor; false when the toolbar is hidden */
function focusFirst(): boolean {
  const first = buttons()[0];
  if (!first || !first.offsetParent) return false;
  first.focus();
  return true;
}
defineExpose({ focusFirst });

function prepareFloating() {
  const layer = bar.value?.parentElement;
  if (!layer) return;
  // tiptap mounts the wrapper as absolute; floating UI must see the fixed offsetParent on its first measure
  layer.style.position = "fixed";
  layer.style.visibility = "hidden";
}
// tiptap's bubble menu runs a delayed update that can land after the editor is destroyed; it then goes to a
// detached element instead of leaving a stray toolbar in the page
const appendTo = () => (props.editor.isDestroyed ? document.createElement("div") : (props.editor.view.dom.closest<HTMLElement>(".wy-editor") ?? document.createElement("div")));
function overflowBounds() {
  const viewport = window.visualViewport;
  const x = viewport?.offsetLeft ?? 0;
  const y = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const bottom = y + (viewport?.height ?? window.innerHeight);
  const toolbar = appendTo().querySelector<HTMLElement>(":scope > .wy-toolbar");
  const top = Math.min(bottom, Math.max(y, toolbar?.getBoundingClientRect().bottom ?? y));
  return {
    // tiptap runs offset after flip/shift; reserve that extra gap when constraining the vertical axis.
    padding: { top: 16, bottom: 16, left: 8, right: 8 },
    rootBoundary: { x, y: top, width, height: bottom - top },
    boundary: width > 640 ? (props.editor.view.dom.closest<HTMLElement>(".wy-surface") ?? []) : [],
  };
}
// touch browsers draw their own selection menu above the text
const coarse = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
const floating = {
  strategy: "fixed" as const,
  placement: coarse ? ("bottom" as const) : ("top" as const),
  offset: 8,
  flip: overflowBounds,
  shift: () => ({ ...overflowBounds(), crossAxis: true }),
  // scrolled out of view, the selection takes its toolbar along instead of pinning it to the edge
  hide: () => ({ strategy: "referenceHidden" as const, rootBoundary: overflowBounds().rootBoundary }),
  onShow: prepareFloating,
};

// a readonly view keeps its selection when the reader selects or clicks elsewhere, which would keep the toolbar up
function onSelectionChange() {
  const e = props.editor;
  const sel = window.getSelection();
  if (e.isDestroyed || e.isEditable || e.state.selection.empty) return;
  if (!sel || sel.isCollapsed || !e.view.dom.contains(sel.anchorNode)) e.commands.setTextSelection(e.state.selection.from);
}
onMounted(() => document.addEventListener("selectionchange", onSelectionChange));
onBeforeUnmount(() => document.removeEventListener("selectionchange", onSelectionChange));
</script>

<template>
  <TiptapBubbleMenu class="wy-bubble-layer" :editor="editor" :should-show="shouldShow" :options="floating" :append-to="appendTo">
    <div ref="bar" class="wy-bubble" role="toolbar" :aria-label="t('bubble.label')" @keydown="onKeydown">
      <template v-if="!readonly">
        <template v-if="state.convert">
          <button v-tooltip="t('convert.title')" type="button" class="wy-tool is-wide wy-bubble-block" aria-haspopup="menu" :aria-label="`${t('convert.title')} ${state.block}`" data-convert-menu @mousedown.prevent @click="emit('convert', $event.currentTarget as HTMLElement)">
            <span class="wy-tool-text">{{ state.block }}</span><ChevronDown :size="14" />
          </button>
          <span class="wy-sep"></span>
        </template>
        <MarkButtons :editor="editor" :tick="tick" :highlight="!colors" />
        <button v-if="b.links" v-tooltip="{ text: t('toolbar.link'), keys: 'Mod-k' }" type="button" class="wy-tool" :aria-label="t('toolbar.link')" :aria-pressed="state.link" @mousedown.prevent @click="emit('link')"><LinkIcon :size="18" /></button>
        <Dropdown v-if="colors" panel-class="wy-color-panel">
          <template #trigger="{ open, toggle }">
            <button v-tooltip="t('toolbar.color')" type="button" class="wy-tool is-wide wy-color-trigger" :aria-label="t('toolbar.color')" aria-haspopup="menu" :aria-expanded="open" @mousedown.prevent @click="toggle">
              <span class="wy-color-sample" :style="{ color: (html ? state.color : tokenCss(state.color)) || undefined, background: (html ? state.mark : tokenCss(state.mark)) || undefined }">A</span><ChevronDown :size="14" />
            </button>
          </template>
          <template #default="{ close }">
            <ColorMenu :editor="editor" :color="state.color" :highlight="state.mark" @done="close" />
          </template>
        </Dropdown>
        <button v-if="b.math" v-tooltip="t('slash.items.mathInline.label')" type="button" class="wy-tool" :aria-label="t('slash.items.mathInline.label')" @mousedown.prevent @click="toMath"><SquareFunction :size="18" /></button>
      </template>
      <template v-if="tools.length">
        <span v-if="!readonly" class="wy-sep"></span>
        <button
          v-for="item in tools"
          :key="item.id"
          v-tooltip="{ text: ctx.text(item.label), keys: item.shortcut }"
          type="button"
          class="wy-tool"
          :aria-label="ctx.text(item.label)"
          :aria-pressed="item.active?.(editor) ?? undefined"
          :disabled="item.enabled ? !item.enabled(editor) : false"
          @mousedown.prevent
          @click="item.run(editor, ctx.services)"
        >
          <component :is="item.icon" :size="18" />
        </button>
      </template>
      <template v-if="ctx.services.askAi && !readonly">
        <span class="wy-sep"></span>
        <button v-tooltip="t('bubble.askAi')" type="button" class="wy-tool is-wide" :aria-label="t('bubble.askAi')" @mousedown.prevent @click="askAi"><Sparkles :size="18" /><span class="wy-tool-text is-optional">{{ t("bubble.askAi") }}</span></button>
      </template>
    </div>
  </TiptapBubbleMenu>
</template>
