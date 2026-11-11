<script setup lang="ts">
// the image (or a diagram's svg) fitted to the viewport; a click anywhere or Esc closes it and focus goes back.
// the clicks of the double click that opened it do not close it again.
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { X } from "@lucide/vue";
import type { ZoomImage } from "../editor/context";

const OPEN_GRACE = 400;

const props = defineProps<{ image: ZoomImage | null; closeLabel: string }>();
const emit = defineEmits<{ close: [] }>();
const closeButton = ref<HTMLButtonElement | null>(null);
let returnTo: HTMLElement | null = null;
let openedAt = 0;

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" && e.key !== "Tab") return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Escape") emit("close");
}

function onClick(e: MouseEvent) {
  if (e.detail > 1 || performance.now() - openedAt < OPEN_GRACE) return;
  emit("close");
}

watch(
  () => props.image,
  async (img, prev) => {
    if (img && !prev) {
      openedAt = performance.now();
      returnTo = document.activeElement as HTMLElement | null;
      document.addEventListener("keydown", onKey, true);
      await nextTick();
      closeButton.value?.focus();
    } else if (!img && prev) {
      document.removeEventListener("keydown", onKey, true);
      returnTo?.focus({ preventScroll: true });
      returnTo = null;
    }
  },
);
onBeforeUnmount(() => document.removeEventListener("keydown", onKey, true));
</script>

<template>
  <Teleport to="body">
    <div v-if="image" class="wy-lightbox" role="dialog" aria-modal="true" :aria-label="image.alt || closeLabel" @click="onClick">
      <div v-if="image.svg" class="wy-lightbox-svg" role="img" :aria-label="image.alt" v-html="image.svg"></div>
      <img v-else class="wy-lightbox-image" :src="image.src" :alt="image.alt" />
      <button ref="closeButton" type="button" class="wy-lightbox-close" :aria-label="closeLabel" :title="closeLabel" @click.stop="emit('close')"><X :size="20" /></button>
    </div>
  </Teleport>
</template>
