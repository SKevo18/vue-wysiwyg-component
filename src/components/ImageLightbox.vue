<script setup lang="ts">
// the image at its natural size, fitted to the viewport; a click anywhere or Esc closes it and focus goes back
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { X } from "@lucide/vue";

const props = defineProps<{ image: { src: string; alt: string } | null; closeLabel: string }>();
const emit = defineEmits<{ close: [] }>();
const closeButton = ref<HTMLButtonElement | null>(null);
let returnTo: HTMLElement | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" && e.key !== "Tab") return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Escape") emit("close");
}

watch(
  () => props.image,
  async (img, prev) => {
    if (img && !prev) {
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
    <div v-if="image" class="wy-lightbox" role="dialog" aria-modal="true" :aria-label="image.alt || closeLabel" @click="emit('close')">
      <img class="wy-lightbox-image" :src="image.src" :alt="image.alt" />
      <button ref="closeButton" type="button" class="wy-lightbox-close" :aria-label="closeLabel" :title="closeLabel"><X :size="20" /></button>
    </div>
  </Teleport>
</template>
