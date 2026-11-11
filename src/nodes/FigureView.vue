<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, ImagePlus, PanelLeft, PanelRight, Scaling, ZoomIn, type LucideIcon } from "@lucide/vue";
import { FIGURE_ALIGNS, mediaKind, shownAlign, type FigureAlign } from "../core/media";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const ICONS: Record<FigureAlign, LucideIcon> = {
  left: AlignHorizontalJustifyStart,
  center: AlignHorizontalJustifyCenter,
  right: AlignHorizontalJustifyEnd,
  "float-left": PanelLeft,
  "float-right": PanelRight,
};

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
const tools = ref<HTMLElement | null>(null);

const caption = computed(() => String(props.node.attrs.caption ?? ""));
const width = computed(() => Number(props.node.attrs.width) || 100);
const media = computed(() => mediaKind(String(props.node.attrs.src ?? "")));
const align = computed<FigureAlign | null>(() => props.node.attrs.align ?? null);
const shown = computed<FigureAlign>(() => shownAlign(align.value, caption.value));
const rightAnchored = computed(() => shown.value === "right" || shown.value === "float-right");
const boxStyle = computed(() => {
  if (props.node.attrs.width) return { "--wy-figure-width": `${width.value}%` };
  if (props.node.attrs.pixels) return { "--wy-figure-width": `${props.node.attrs.pixels}px` };
  return undefined;
});

function el(): HTMLElement | null {
  return (box.value?.$el ?? null) as HTMLElement | null;
}

function column(node: HTMLElement) {
  const parent = node.parentElement!;
  const cs = getComputedStyle(parent);
  const left = parent.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
  return { left, width: parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
}

const toolsStyle = ref("");
let observer: ResizeObserver | null = null;

function place() {
  const node = el();
  const parent = tools.value?.offsetParent as HTMLElement | null;
  if (!node?.parentElement || !parent) return;
  const col = column(node);
  toolsStyle.value = `left: ${col.left - parent.getBoundingClientRect().left}px; max-width: ${col.width}px`;
}

watch(editing, async (on) => {
  observer?.disconnect();
  observer = null;
  form.value = false;
  if (!on) return;
  await nextTick();
  const node = el();
  if (!node?.parentElement) return;
  observer = new ResizeObserver(place);
  observer.observe(node);
  observer.observe(node.parentElement);
  place();
});
watch([shown, width], place, { flush: "post" });
onBeforeUnmount(() => observer?.disconnect());

function setWidth(n: number) {
  if (!Number.isFinite(n)) return;
  const w = Math.min(100, Math.max(10, Math.round(n)));
  update({ width: w === 100 ? null : w, pixels: null });
}

function onWidthKey(e: KeyboardEvent) {
  const step = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
  if (step) {
    e.preventDefault();
    setWidth(width.value + step * (e.shiftKey ? 10 : 1));
  } else if (e.key === "Enter") {
    e.preventDefault();
    setWidth(Number((e.target as HTMLInputElement).value));
  }
}

function startResize(e: PointerEvent) {
  const node = el();
  const handle = e.currentTarget as HTMLElement;
  if (!node?.parentElement || readonly.value) return;
  e.preventDefault();
  const col = column(node).width;
  const startX = e.clientX;
  const startW = node.getBoundingClientRect().width;
  const factor = shown.value === "center" ? 2 : rightAnchored.value ? -1 : 1;
  const move = (ev: PointerEvent) => setWidth(((startW + (ev.clientX - startX) * factor) / col) * 100);
  const stop = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", stop);
    handle.removeEventListener("pointercancel", stop);
  };
  handle.setPointerCapture(e.pointerId);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
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
          <img v-else :src="node.attrs.src" :alt="node.attrs.alt || ''" :class="{ 'is-zoomable': readonly }" loading="lazy" draggable="false" @click="editor.isEditable ? editing || startEdit() : zoom()" />
          <span v-if="editing" class="wy-figure-resize" :class="{ 'is-left': rightAnchored }" role="separator" :aria-label="t('image.resize')" :title="t('image.resize')" contenteditable="false" @pointerdown="startResize"></span>
        </span>
        <figcaption v-if="editing" class="wy-figure-caption-edit" contenteditable="false" @mousedown.stop>
          <component :is="Field" v-if="markdown" class="wy-field-quiet" size="compact" format="markdown" inline :model-value="caption" :placeholder="t('image.captionPlaceholder')" @update:model-value="(v: string) => update({ caption: v || null })" />
          <input v-else class="wy-input is-quiet" :value="caption" :placeholder="t('image.captionPlaceholder')" @input="update({ caption: ($event.target as HTMLInputElement).value || null })" />
        </figcaption>
        <figcaption v-else-if="caption" @click="startEdit()">{{ caption }}</figcaption>
      </figure>
      <div v-if="editing" ref="tools" class="wy-figure-tools" :style="toolsStyle" contenteditable="false" data-block-portal @mousedown.stop>
        <div class="wy-figure-bar">
          <div class="wy-seg" role="group">
            <button v-for="a in aligns" :key="a" v-tooltip="t(`image.align.${a}`)" type="button" :aria-pressed="shown === a" :aria-label="t(`image.align.${a}`)" @click="update({ align: a })">
              <component :is="ICONS[a]" :size="16" />
            </button>
          </div>
          <label class="wy-inline-field">
            <span class="wy-label">{{ t("image.width") }}</span>
            <input class="wy-input is-sm is-num" type="number" min="10" max="100" step="1" :value="width" :aria-label="t('image.width')" @change="setWidth(Number(($event.target as HTMLInputElement).value))" @keydown="onWidthKey" />
            <span class="wy-muted">%</span>
          </label>
          <button v-tooltip="t('image.originalSize')" type="button" class="wy-tool" :aria-label="t('image.originalSize')" :disabled="!node.attrs.width && !node.attrs.pixels" @click="update({ width: null, pixels: null })"><Scaling :size="16" /></button>
          <button v-if="!media" v-tooltip="t('image.zoom')" type="button" class="wy-tool" :aria-label="t('image.zoom')" @click="zoom"><ZoomIn :size="16" /></button>
          <button type="button" class="wy-btn is-sm" :aria-expanded="form" @click="form = !form"><ImagePlus :size="16" />{{ t("image.replace") }}</button>
          <component :is="h.tools" v-for="(h, i) in ctx.figure.filter((x) => x.tools)" :key="i" v-bind="props" />
        </div>
        <div v-if="form" class="wy-figure-form">
          <label class="wy-field">
            <span class="wy-label">{{ t("image.alt") }}</span>
            <input class="wy-input is-sm" type="text" :value="node.attrs.alt || ''" :placeholder="t('image.altPlaceholder')" @input="update({ alt: ($event.target as HTMLInputElement).value || null })" />
          </label>
          <span class="wy-menu-hint">{{ t("image.altHelp") }}</span>
          <button v-if="ctx.services.upload || ctx.services.pickFile" type="button" class="wy-btn is-sm" @click="replace">{{ t("image.replaceFile") }}</button>
        </div>
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
