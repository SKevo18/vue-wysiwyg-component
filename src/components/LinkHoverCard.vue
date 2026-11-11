<script setup lang="ts">
// the link under the pointer, or (for keyboard and touch) the one holding an empty caret, with its address and
// actions. it never takes focus from the editor.
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Editor } from "@tiptap/core";
import { Copy, ExternalLink, Pencil, Unlink } from "@lucide/vue";
import { openHref, removeLink } from "../editor/behaviour";
import { useEditorContext } from "../editor/context";
import AnchoredPopover from "./AnchoredPopover.vue";
import { vTooltip } from "./tooltip";

const props = defineProps<{ editor: Editor; tick: number; readonly: boolean; focused: boolean }>();
const emit = defineEmits<{ edit: [] }>();
const ctx = useEditorContext();
const t = ctx.t;

const SHOW_DELAY = 350;
const HIDE_DELAY = 250;
const anchor = ref<HTMLAnchorElement | null>(null);
const href = ref("");
/** shown for the pointer (kept while the pointer is on the link or the card), else for the caret */
let byPointer = false;
let onCard = false;
let showTimer = 0;
let hideTimer = 0;

function ownLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  return link && link.closest(".ProseMirror") === props.editor.view.dom ? link : null;
}

function show(link: HTMLAnchorElement | null) {
  anchor.value = link;
  href.value = link?.getAttribute("href") ?? "";
}

/** the link around an empty caret of a focused, editable editor */
function caretLink(): HTMLAnchorElement | null {
  const e = props.editor;
  const sel = e.state.selection;
  if (props.readonly || e.isDestroyed || !sel.empty || !e.view.hasFocus() || !e.isActive("link")) return null;
  const { node } = e.view.domAtPos(sel.from);
  return ownLink(node instanceof Element ? node : node.parentElement);
}

function hideSoon() {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (onCard) return;
    byPointer = false;
    show(caretLink());
  }, HIDE_DELAY);
}

function onOver(e: MouseEvent) {
  const link = ownLink(e.target);
  if (!link) return;
  window.clearTimeout(hideTimer);
  if (link === anchor.value) return;
  window.clearTimeout(showTimer);
  showTimer = window.setTimeout(() => {
    byPointer = true;
    show(link);
  }, SHOW_DELAY);
}

function onOut(e: MouseEvent) {
  if (ownLink(e.target) && !ownLink(e.relatedTarget)) hideSoon();
}

function onCardEnter() {
  onCard = true;
  window.clearTimeout(hideTimer);
}

function onCardLeave() {
  onCard = false;
  hideSoon();
}

watch(
  () => [props.tick, props.focused],
  () => {
    if (byPointer && anchor.value?.isConnected) return;
    byPointer = false;
    show(caretLink());
  },
);
let dom: HTMLElement | null = null;
onMounted(() => {
  dom = props.editor.view.dom;
  dom.addEventListener("mouseover", onOver);
  dom.addEventListener("mouseout", onOut);
});
onBeforeUnmount(() => {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  dom?.removeEventListener("mouseover", onOver);
  dom?.removeEventListener("mouseout", onOut);
});

/** puts an empty caret inside the link, where the link commands find it */
function take(): boolean {
  const link = anchor.value;
  byPointer = false;
  show(null);
  if (!link?.isConnected) return false;
  props.editor.chain().focus().setTextSelection(props.editor.view.posAtDOM(link, 0) + 1).run();
  return true;
}

async function copy() {
  try {
    await navigator.clipboard.writeText(href.value);
    ctx.services.toast?.(t("editor.copied"), "success");
  } catch {
  }
}

function edit() {
  if (take()) emit("edit");
}

function remove() {
  if (take()) removeLink(props.editor);
}
</script>

<template>
  <AnchoredPopover v-if="anchor" :anchor="anchor" class="wy-link-card" role="toolbar" :aria-label="t('link.title')" @mouseenter="onCardEnter" @mouseleave="onCardLeave" @escape="show(null)">
    <span class="wy-link-card-url" :title="href">{{ href }}</span>
    <button v-tooltip="t('link.open')" type="button" class="wy-tool is-sm" :aria-label="t('link.open')" @mousedown.prevent @click="openHref(ctx.services, href, $event)"><ExternalLink :size="15" /></button>
    <button v-tooltip="t('link.copy')" type="button" class="wy-tool is-sm" :aria-label="t('link.copy')" @mousedown.prevent @click="copy"><Copy :size="15" /></button>
    <template v-if="!readonly">
      <button v-tooltip="t('link.edit')" type="button" class="wy-tool is-sm" :aria-label="t('link.edit')" @mousedown.prevent @click="edit"><Pencil :size="15" /></button>
      <button v-tooltip="t('link.remove')" type="button" class="wy-tool is-sm" :aria-label="t('link.remove')" @mousedown.prevent @click="remove"><Unlink :size="15" /></button>
    </template>
  </AnchoredPopover>
</template>
