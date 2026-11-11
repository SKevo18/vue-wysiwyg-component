<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref, watch } from "vue";
import { ImagePlus } from "@lucide/vue";
import { FIGURE_ALIGNS, mediaKind, shownAlign, type FigureAlign } from "../core/media";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import MediaTools from "./MediaTools.vue";
import { rightAnchored, startMediaResize } from "./media";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const markdown = ctx.config.format === "markdown";
// mail clients do not float images reliably, so html offers the three block alignments
const aligns = markdown ? FIGURE_ALIGNS : (["left", "center", "right"] as const);
const Field = ctx.field;
const { selected, editing, startEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
const form = ref(false);
const box = ref<InstanceType<typeof NodeViewWrapper> | null>(null);
const boxEl = computed(() => (box.value?.$el ?? null) as HTMLElement | null);

const caption = computed(() => String(props.node.attrs.caption ?? ""));
const width = computed(() => Number(props.node.attrs.width) || 100);
const media = computed(() => mediaKind(String(props.node.attrs.src ?? "")));
const align = computed<FigureAlign | null>(() => props.node.attrs.align ?? null);
const shown = computed<FigureAlign>(() => shownAlign(align.value, caption.value));
const boxStyle = computed(() => {
  if (props.node.attrs.width) return { "--wy-figure-width": `${width.value}%` };
  if (props.node.attrs.pixels) return { "--wy-figure-width": `${props.node.attrs.pixels}px` };
  return undefined;
});

watch(editing, () => (form.value = false));

function setWidth(w: number) {
  update({ width: w === 100 ? null : w, pixels: null });
}

function startResize(e: PointerEvent) {
  if (boxEl.value && !readonly.value) startMediaResize(e, boxEl.value, shown.value, setWidth);
}

async function replace() {
  const first = (await ctx.files.choose("image", false))[0];
  if (!first) return;
  try {
    const up = first instanceof File ? await ctx.files.upload(first) : first;
    update({ src: up.url, alt: props.node.attrs.alt || up.name.replace(/\.[^.]+$/, "") || null });
  } catch {
    ctx.services.toast?.(t("editor.uploadFailed", { name: first.name }), "error");
  }
}

function zoom() {
  ctx.zoom({ src: String(props.node.attrs.src ?? ""), alt: String(props.node.attrs.alt ?? "") });
}
</script>

<template>
  <NodeViewWrapper ref="box" as="div" class="wy-node wy-node-figure wy-figure" :class="`wy-align-${shown}`" :style="boxStyle">
    <BlockFrame :label="t(media ? `image.${media}` : 'image.label')" :selected="selected || editing" :readonly="readonly" :copy-text="copyText" @edit="startEdit" @delete="remove">
      <figure class="wy-figure-inner">
        <span class="wy-figure-media">
          <video v-if="media === 'video'" :src="node.attrs.src" controls preload="metadata" :aria-label="node.attrs.alt || ''" @click="editing || startEdit()"></video>
          <audio v-else-if="media === 'audio'" :src="node.attrs.src" controls preload="metadata" :aria-label="node.attrs.alt || ''" @click="editing || startEdit()"></audio>
          <img v-else :src="node.attrs.src" :alt="node.attrs.alt || ''" :class="{ 'is-zoomable': readonly }" loading="lazy" draggable="false" @click="editor.isEditable ? editing || startEdit() : zoom()" @dblclick="zoom" />
          <span v-if="editing" class="wy-figure-resize" :class="{ 'is-left': rightAnchored(shown) }" role="separator" :aria-label="t('image.resize')" :title="t('image.resize')" contenteditable="false" @pointerdown="startResize"></span>
        </span>
        <figcaption v-if="editing" class="wy-figure-caption-edit" contenteditable="false" @mousedown.stop>
          <component :is="Field" v-if="markdown" class="wy-field-quiet" size="compact" format="markdown" inline :model-value="caption" :placeholder="t('image.captionPlaceholder')" @update:model-value="(v: string) => update({ caption: v || null })" />
          <input v-else class="wy-input is-quiet" :value="caption" :placeholder="t('image.captionPlaceholder')" @input="update({ caption: ($event.target as HTMLInputElement).value || null })" />
        </figcaption>
        <figcaption v-else-if="caption" @click="startEdit()">{{ caption }}</figcaption>
      </figure>
      <MediaTools
        v-if="editing"
        :box="boxEl"
        :aligns="aligns"
        :align="shown"
        :width="width"
        :resettable="!!node.attrs.width || !!node.attrs.pixels"
        :zoomable="!media"
        @align="(a) => update({ align: a })"
        @width="setWidth"
        @reset="update({ width: null, pixels: null })"
        @zoom="zoom"
      >
        <button type="button" class="wy-btn is-sm" :aria-expanded="form" @click="form = !form"><ImagePlus :size="16" />{{ t("image.replace") }}</button>
        <component :is="h.tools" v-for="(h, i) in ctx.figure.filter((x) => x.tools)" :key="i" v-bind="props" />
        <template #form>
          <div v-if="form" class="wy-figure-form">
            <label class="wy-field">
              <span class="wy-label">{{ t("image.alt") }}</span>
              <input class="wy-input is-sm" type="text" :value="node.attrs.alt || ''" :placeholder="t('image.altPlaceholder')" @input="update({ alt: ($event.target as HTMLInputElement).value || null })" />
            </label>
            <span class="wy-menu-hint">{{ t("image.altHelp") }}</span>
            <button v-if="ctx.services.upload || ctx.services.pickFile" type="button" class="wy-btn is-sm" @click="replace">{{ t("image.replaceFile") }}</button>
          </div>
        </template>
      </MediaTools>
    </BlockFrame>
  </NodeViewWrapper>
</template>
