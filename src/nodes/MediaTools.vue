<script setup lang="ts">
// The toolbar above a figure or a diagram while it is edited: alignment, width in percent, original size and enlarge.
// It spans the column of the media box, so a narrow image still gets a full bar. Extra buttons go in the default slot,
// a form below the bar in the `form` slot.
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, PanelLeft, PanelRight, Scaling, ZoomIn, type LucideIcon } from "@lucide/vue";
import type { FigureAlign } from "../core/media";
import { useEditorContext } from "../editor/context";
import { vTooltip } from "../components/tooltip";
import { clampWidth, mediaColumn } from "./media";

const ICONS: Record<FigureAlign, LucideIcon> = {
  left: AlignHorizontalJustifyStart,
  center: AlignHorizontalJustifyCenter,
  right: AlignHorizontalJustifyEnd,
  "float-left": PanelLeft,
  "float-right": PanelRight,
};

const props = defineProps<{ box: HTMLElement | null; aligns: readonly FigureAlign[]; align: FigureAlign; width: number; resettable: boolean; zoomable: boolean }>();
const emit = defineEmits<{ align: [align: FigureAlign]; width: [percent: number]; reset: []; zoom: [] }>();
const t = useEditorContext().t;
const root = ref<HTMLElement | null>(null);
const style = ref("");
let observer: ResizeObserver | null = null;

function place() {
  const node = props.box;
  const parent = root.value?.offsetParent as HTMLElement | null;
  if (!node?.parentElement || !parent) return;
  const col = mediaColumn(node);
  style.value = `left: ${col.left - parent.getBoundingClientRect().left}px; max-width: ${col.width}px`;
}

function observe() {
  observer?.disconnect();
  const node = props.box;
  if (!node?.parentElement) return;
  observer = new ResizeObserver(place);
  observer.observe(node);
  observer.observe(node.parentElement);
  place();
}

function set(n: number) {
  const w = clampWidth(n);
  if (w !== null) emit("width", w);
}

function onWidthKey(e: KeyboardEvent) {
  const step = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
  if (step) {
    e.preventDefault();
    set(props.width + step * (e.shiftKey ? 10 : 1));
  } else if (e.key === "Enter") {
    e.preventDefault();
    set(Number((e.target as HTMLInputElement).value));
  }
}

onMounted(observe);
watch(() => props.box, observe);
watch(() => [props.align, props.width], place, { flush: "post" });
onBeforeUnmount(() => observer?.disconnect());
defineExpose({ place });
</script>

<template>
  <div ref="root" class="wy-figure-tools wy-media-tools" :style="style" contenteditable="false" data-block-portal @mousedown.stop>
    <div class="wy-figure-bar">
      <div class="wy-seg" role="group">
        <button v-for="a in aligns" :key="a" v-tooltip="t(`image.align.${a}`)" type="button" :aria-pressed="align === a" :aria-label="t(`image.align.${a}`)" @click="emit('align', a)">
          <component :is="ICONS[a]" :size="16" />
        </button>
      </div>
      <label class="wy-inline-field">
        <span class="wy-label">{{ t("image.width") }}</span>
        <input class="wy-input is-sm is-num" type="number" min="10" max="100" step="1" :value="width" :aria-label="t('image.width')" @change="set(Number(($event.target as HTMLInputElement).value))" @keydown="onWidthKey" />
        <span class="wy-muted">%</span>
      </label>
      <button v-tooltip="t('image.originalSize')" type="button" class="wy-tool" :aria-label="t('image.originalSize')" :disabled="!resettable" @click="emit('reset')"><Scaling :size="16" /></button>
      <button v-if="zoomable" v-tooltip="t('image.zoom')" type="button" class="wy-tool" :aria-label="t('image.zoom')" @click="emit('zoom')"><ZoomIn :size="16" /></button>
      <slot />
    </div>
    <slot name="form" />
  </div>
</template>
