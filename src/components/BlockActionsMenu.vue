<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { Editor } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { NodeSelection, Selection } from "@tiptap/pm/state";
import { ChevronRight, Copy, CopyPlus, Palette, Trash2 } from "@lucide/vue";
import { isBgToken } from "../core/colors";
import { blockColorOf, colorTargets, setBlockColor } from "../editor/blockColor";
import { useEditorContext } from "../editor/context";
import { convertRun, runTargets, type BlockRun } from "../editor/convert";
import { fragmentHtml, fragmentMarkdown } from "../markdown";
import AnchoredPopover from "./AnchoredPopover.vue";
import ColorMenu from "./ColorMenu.vue";
import ConvertItems from "./ConvertItems.vue";

const props = defineProps<{ editor: Editor; run: BlockRun; anchor: HTMLElement; convertOnly?: boolean; selectAll?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const ctx = useEditorContext();
const t = ctx.t;

type Sub = "convert" | "color";
const targets = computed(() => runTargets(ctx.convert, props.editor.state, props.run));
const colorable = computed(() => colorTargets(props.editor.state, props.run).length > 0);
const blockColor = computed(() => blockColorOf(props.editor.state, props.run));
const sub = ref<Sub | null>(null);
const menuEl = ref<HTMLElement | null>(null);
const subEl = ref<HTMLElement | null>(null);
const triggers: Record<Sub, HTMLElement | null> = { convert: null, color: null };
const trigger = computed(() => (sub.value ? triggers[sub.value] : null));

function focusItem(root: HTMLElement | null, which: "first" | "last" | 1 | -1) {
  const items = [...(root?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = which === "first" ? 0 : which === "last" ? items.length - 1 : (i + which + items.length) % items.length;
  items[next]!.focus({ preventScroll: true });
}

async function openSub(which: Sub, focus: boolean) {
  sub.value = which;
  if (!focus) return;
  await nextTick();
  focusItem(subEl.value, "first");
}

function closeSub() {
  trigger.value?.focus({ preventScroll: true });
  sub.value = null;
}

function finish() {
  emit("close");
  props.editor.view.focus();
}

function convert(target: string) {
  const tr = convertRun(ctx.convert, props.editor.state, props.run, target, props.selectAll);
  if (tr) props.editor.view.dispatch(tr);
  finish();
}

function color(token: string | null) {
  setBlockColor(props.editor, props.run, token);
  finish();
}

function duplicate() {
  const { state } = props.editor;
  const { to, nodes } = props.run;
  const tr = state.tr.insert(to, Fragment.from(nodes));
  const first = tr.doc.nodeAt(to);
  if (nodes.length === 1 && first && !first.isTextblock && NodeSelection.isSelectable(first)) tr.setSelection(NodeSelection.create(tr.doc, to));
  else tr.setSelection(Selection.near(tr.doc.resolve(to + 1)));
  props.editor.view.dispatch(tr.scrollIntoView());
  finish();
}

async function copy() {
  const schema = props.editor.schema;
  const nodes = props.run.nodes;
  const text = ctx.config.format === "markdown" ? fragmentMarkdown(ctx.markdown, nodes, schema) : fragmentHtml(Fragment.from(nodes), schema);
  finish();
  try {
    await navigator.clipboard.writeText(text);
    ctx.services.toast?.(t("editor.copied"), "success");
  } catch {
  }
}

function remove() {
  props.editor.view.dispatch(props.editor.state.tr.delete(props.run.from, props.run.to).scrollIntoView());
  finish();
}

function onKeydown(e: KeyboardEvent, inSub: boolean) {
  const root = inSub ? subEl.value : menuEl.value;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp":
      focusItem(root, e.key === "ArrowDown" ? 1 : -1);
      break;
    case "Home":
    case "End":
      focusItem(root, e.key === "Home" ? "first" : "last");
      break;
    case "ArrowRight": {
      const which = (Object.keys(triggers) as Sub[]).find((k) => triggers[k] === document.activeElement);
      if (inSub || !which) return;
      void openSub(which, true);
      break;
    }
    case "ArrowLeft":
      if (!inSub) return;
      closeSub();
      break;
    case "Escape":
      if (inSub) closeSub();
      else finish();
      break;
    case "Tab":
      finish();
      break;
    default:
      return;
  }
  e.preventDefault();
  e.stopPropagation();
}

function onDocDown(e: MouseEvent) {
  const target = e.target as Node;
  if (menuEl.value?.contains(target) || subEl.value?.contains(target) || props.anchor.contains(target)) return;
  emit("close");
}

onMounted(async () => {
  document.addEventListener("mousedown", onDocDown, true);
  await nextTick();
  focusItem(menuEl.value, "first");
});
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
</script>

<template>
  <AnchoredPopover :anchor="anchor" class="wy-menu wy-block-actions">
    <div ref="menuEl" class="wy-menu-list" role="menu" :aria-label="convertOnly ? t('convert.title') : t('blockMenu.label')" @keydown="onKeydown($event, false)">
      <ConvertItems v-if="convertOnly" :targets="targets" @pick="convert" />
      <template v-else>
        <button
          v-if="targets.length"
          :ref="(el) => (triggers.convert = el as HTMLElement | null)"
          type="button"
          class="wy-menu-item"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="sub === 'convert'"
          data-convert-menu
          @mousedown.prevent
          @pointerenter="$event.pointerType === 'mouse' && openSub('convert', false)"
          @click="openSub('convert', true)"
        >
          <span class="wy-grow">{{ t("convert.title") }}</span>
          <ChevronRight class="wy-menu-icon" :size="16" aria-hidden="true" />
        </button>
        <button
          v-if="colorable"
          :ref="(el) => (triggers.color = el as HTMLElement | null)"
          type="button"
          class="wy-menu-item"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="sub === 'color'"
          data-color-menu
          @mousedown.prevent
          @pointerenter="$event.pointerType === 'mouse' && openSub('color', false)"
          @click="openSub('color', true)"
        >
          <Palette class="wy-menu-icon" :size="16" aria-hidden="true" />
          <span class="wy-grow">{{ t("blockMenu.color") }}</span>
          <ChevronRight class="wy-menu-icon" :size="16" aria-hidden="true" />
        </button>
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @mouseenter="sub = null" @click="duplicate"><CopyPlus class="wy-menu-icon" :size="16" aria-hidden="true" />{{ t("blockMenu.duplicate") }}</button>
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @mouseenter="sub = null" @click="copy"><Copy class="wy-menu-icon" :size="16" aria-hidden="true" />{{ t("blockMenu.copy") }}</button>
        <button type="button" class="wy-menu-item is-danger" role="menuitem" @mousedown.prevent @mouseenter="sub = null" @click="remove"><Trash2 class="wy-menu-icon" :size="16" aria-hidden="true" />{{ t("blockMenu.delete") }}</button>
      </template>
    </div>
  </AnchoredPopover>
  <AnchoredPopover v-if="sub && trigger" :anchor="trigger" side="right" class="wy-menu wy-block-actions" :class="{ 'wy-color-panel': sub === 'color' }">
    <div v-if="sub === 'convert'" ref="subEl" class="wy-menu-list" role="menu" :aria-label="t('convert.title')" @keydown="onKeydown($event, true)">
      <ConvertItems :targets="targets" @pick="convert" />
    </div>
    <div v-else ref="subEl" @keydown="onKeydown($event, true)">
      <ColorMenu :editor="editor" block :color="isBgToken(blockColor) ? '' : blockColor" :highlight="isBgToken(blockColor) ? blockColor : ''" @pick="color" />
    </div>
  </AnchoredPopover>
</template>
