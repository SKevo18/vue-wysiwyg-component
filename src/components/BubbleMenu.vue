<script setup lang="ts">
import { computed, ref } from "vue";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/vue-3/menus";
import { Baseline, ChevronDown, Link as LinkIcon, Sparkles, SquareFunction } from "@lucide/vue";
import { useEditorContext } from "../editor/context";
import { runTargets, selectionRun } from "../editor/convert";
import { insertFresh } from "../editor/fresh";
import { fragmentHtml, fragmentMarkdown } from "../markdown";
import Dropdown from "./Dropdown.vue";
import ColorMenu from "./ColorMenu.vue";
import MarkButtons from "./MarkButtons.vue";
import { vTooltip } from "./tooltip";

const props = defineProps<{ editor: Editor; tick: number; readonly?: boolean }>();
const emit = defineEmits<{ link: []; convert: [button: HTMLElement] }>();
const ctx = useEditorContext();
const t = ctx.t;
const b = ctx.config.base;
const html = ctx.config.format === "html";
const CONTEXT_CHARS = 600;
const bubble = ref<HTMLElement | null>(null);
// a readonly editor only offers the tools marked readonly (e.g. commenting on a selection)
const tools = computed(() => (props.readonly ? ctx.bubble.filter((item) => item.readonly) : ctx.bubble));

const state = computed(() => {
  void props.tick;
  const e = props.editor;
  const run = e.state.selection.empty || ctx.inline ? null : selectionRun(e.state);
  return {
    link: e.isActive("link"),
    color: String(e.getAttributes("textStyle").color ?? ""),
    mark: String(e.getAttributes("highlight").color ?? ""),
    convert: !!run && runTargets(ctx.convert, e.state, run).length > 0,
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

function prepareFloating() {
  const layer = bubble.value?.parentElement;
  if (!layer) return;
  // tiptap mounts the wrapper as absolute; floating UI must see the fixed offsetParent on its first measure
  layer.style.position = "fixed";
  layer.style.visibility = "hidden";
}
// tiptap's bubble menu runs a delayed update that can land after the editor is destroyed
const appendTo = () => (props.editor.isDestroyed ? document.body : props.editor.view.dom.closest<HTMLElement>(".wy-editor")!);
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
    boundary: width > 640 ? props.editor.view.dom.closest<HTMLElement>(".wy-surface")! : [],
  };
}
const floating = {
  strategy: "fixed" as const,
  placement: "top" as const,
  offset: 8,
  flip: overflowBounds,
  shift: () => ({ ...overflowBounds(), crossAxis: true }),
  onShow: prepareFloating,
};
</script>

<template>
  <TiptapBubbleMenu class="wy-bubble-layer" :editor="editor" :should-show="shouldShow" :options="floating" :append-to="appendTo">
    <div ref="bubble" class="wy-bubble" role="toolbar" :aria-label="t('bubble.label')">
      <template v-if="!readonly">
        <template v-if="state.convert">
          <button type="button" class="wy-tool is-wide" aria-haspopup="menu" data-convert-menu @mousedown.prevent @click="emit('convert', $event.currentTarget as HTMLElement)">
            <span class="wy-tool-text">{{ t("convert.title") }}</span><ChevronDown :size="14" />
          </button>
          <span class="wy-sep"></span>
        </template>
        <MarkButtons :editor="editor" :tick="tick" />
      </template>
      <Dropdown v-if="!readonly && html && (b.color || b.highlight)" panel-class="wy-color-panel">
        <template #trigger="{ open, toggle }">
          <button v-tooltip="t('toolbar.color')" type="button" class="wy-tool" :aria-label="t('toolbar.color')" aria-haspopup="menu" :aria-expanded="open" @mousedown.prevent @click="toggle"><Baseline :size="18" :style="{ color: state.color || undefined }" /></button>
        </template>
        <template #default="{ close }">
          <ColorMenu :editor="editor" :color="state.color" :highlight="state.mark" @done="close" />
        </template>
      </Dropdown>
      <button v-if="!readonly && b.links" v-tooltip="{ text: t('toolbar.link'), keys: 'Mod-k' }" type="button" class="wy-tool" :aria-label="t('toolbar.link')" :aria-pressed="state.link" @mousedown.prevent @click="emit('link')"><LinkIcon :size="18" /></button>
      <button v-if="!readonly && b.math" v-tooltip="t('slash.items.mathInline.label')" type="button" class="wy-tool" :aria-label="t('slash.items.mathInline.label')" @mousedown.prevent @click="toMath"><SquareFunction :size="18" /></button>
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
      <template v-if="ctx.services.askAi && !readonly">
        <span class="wy-sep"></span>
        <button v-tooltip="t('bubble.askAi')" type="button" class="wy-tool is-wide" :aria-label="t('bubble.askAi')" @mousedown.prevent @click="askAi"><Sparkles :size="18" /><span class="wy-tool-text is-optional">{{ t("bubble.askAi") }}</span></button>
      </template>
    </div>
  </TiptapBubbleMenu>
</template>
