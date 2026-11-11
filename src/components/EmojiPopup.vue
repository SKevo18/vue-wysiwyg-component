<script setup lang="ts">
// the emoji picker at the caret ("Emoji" in the slash menu): a click outside or Esc closes it
import { onBeforeUnmount, onMounted, ref } from "vue";
import EmojiPicker from "./EmojiPicker.vue";
import type { Translate } from "../i18n";

defineProps<{ t: Translate }>();

const emit = defineEmits<{ pick: [emoji: string]; close: [] }>();
const root = ref<HTMLElement | null>(null);

function onDocDown(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) emit("close");
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  e.stopPropagation();
  emit("close");
}

onMounted(() => document.addEventListener("mousedown", onDocDown, true));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
</script>

<template>
  <div ref="root" class="wy-emoji-popup" contenteditable="false" @keydown="onKey">
    <EmojiPicker :t="t" @pick="emit('pick', $event)" />
  </div>
</template>
