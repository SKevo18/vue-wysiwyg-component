<script setup lang="ts">
// the iframe takes the first click (a video plays at once); the block is selected through its grip or its label.
// a shield covers the iframe only while its height is dragged, and grip drags switch iframe pointer events off.
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, ref, watch } from "vue";
import { ExternalLink, Pencil } from "@lucide/vue";
import { EMBED_HEIGHTS, EMBED_MAX_HEIGHT, EMBED_MIN_HEIGHT, embedFor, embedSandbox, type EmbedProvider } from "../core/embeds";
import { embedAttrs } from "../builtins/embed";
import { normalizeHref } from "../editor/behaviour";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, stopEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
const menu = ref(false);
const input = ref<HTMLInputElement | null>(null);
const draft = ref("");
const url = computed<string>(() => props.node.attrs.url ?? "");
// derived from the url every time, never taken from the stored attribute
const target = computed(() => embedFor(url.value));
const provider = computed<EmbedProvider>(() => target.value?.provider ?? "generic");
const height = computed<number | null>(() => props.node.attrs.height ?? EMBED_HEIGHTS[provider.value]);
const live = ref<number | null>(null);
const shown = computed(() => live.value ?? height.value);

watch(
  editing,
  async (on) => {
    if (!on) return;
    draft.value = url.value;
    await nextTick();
    input.value?.focus();
    input.value?.select();
  },
  { immediate: true },
);

function submit() {
  const next = normalizeHref(draft.value);
  if (!embedFor(next)) return;
  update(embedAttrs(next, { height: next === url.value ? props.node.attrs.height : null }));
  finishEdit();
}

function cancel() {
  if (!url.value) remove();
  else stopEdit();
}

function select() {
  const pos = props.getPos();
  if (typeof pos === "number") props.editor.commands.setNodeSelection(pos);
}

let startY = 0;
let startH = 0;

function onResizeDown(e: PointerEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  const frame = (e.currentTarget as HTMLElement).parentElement!.querySelector(".wy-embed-frame") as HTMLElement;
  startY = e.clientY;
  startH = frame.getBoundingClientRect().height;
  live.value = Math.round(startH);
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onResizeMove(e: PointerEvent) {
  if (live.value === null) return;
  live.value = Math.round(Math.min(EMBED_MAX_HEIGHT, Math.max(EMBED_MIN_HEIGHT, startH + e.clientY - startY)));
}

function onResizeUp() {
  if (live.value === null) return;
  const h = live.value;
  live.value = null;
  if (h !== props.node.attrs.height) update({ height: h });
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-embed">
    <BlockFrame :label="t(`embed.providers.${provider}`)" :selected="selected" :editing="editing" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu" @select="select">
      <form v-if="editing || !url" class="wy-url-form" contenteditable="false" data-block-portal @mousedown.stop @submit.prevent="submit">
        <input ref="input" v-model="draft" class="wy-input" type="url" inputmode="url" autocomplete="off" spellcheck="false" :placeholder="t('embed.placeholder')" :aria-label="t('embed.url')" :readonly="readonly" @keydown.esc.prevent.stop="cancel" />
        <button type="submit" class="wy-btn is-primary" :disabled="!embedFor(normalizeHref(draft))">{{ t("embed.create") }}</button>
      </form>
      <div v-else-if="target" class="wy-embed" :data-provider="provider" contenteditable="false">
        <iframe
          class="wy-embed-frame"
          :class="{ 'is-video': shown === null }"
          :src="target.src"
          :style="shown !== null ? { height: `${shown}px` } : undefined"
          :sandbox="embedSandbox(target.src)"
          allow="fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          referrerpolicy="strict-origin-when-cross-origin"
          loading="lazy"
          :title="t(`embed.providers.${provider}`)"
        ></iframe>
        <div
          v-if="!readonly"
          v-tooltip="t('embed.resize')"
          class="wy-embed-resize"
          role="separator"
          aria-orientation="horizontal"
          :aria-label="t('embed.resize')"
          @pointerdown="onResizeDown"
          @pointermove="onResizeMove"
          @pointerup="onResizeUp"
          @pointercancel="onResizeUp"
        ></div>
        <div v-if="live !== null" class="wy-embed-shield" aria-hidden="true"></div>
      </div>
      <a v-else class="wy-embed-fallback" :href="url" target="_blank" rel="noopener noreferrer" contenteditable="false">{{ url }}</a>
      <template #menu>
        <BlockMenu :open="menu" @close="menu = false">
          <button v-if="url && !readonly" type="button" class="wy-menu-item" role="menuitem" @click="(menu = false), startEdit()"><Pencil class="wy-menu-icon" :size="16" />{{ t("embed.edit") }}</button>
          <a v-if="url" class="wy-menu-item" role="menuitem" :href="url" target="_blank" rel="noopener noreferrer" @click="menu = false"><ExternalLink class="wy-menu-icon" :size="16" />{{ t("embed.open") }}</a>
          <button v-if="node.attrs.height && !readonly" type="button" class="wy-menu-item" role="menuitem" @click="(update({ height: null }), (menu = false))">{{ t("embed.defaultHeight") }}</button>
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
