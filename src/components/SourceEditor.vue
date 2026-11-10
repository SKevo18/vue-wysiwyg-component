<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const area = ref<HTMLTextAreaElement | null>(null);

function fit() {
  const el = area.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

watch(() => props.modelValue, () => void nextTick(fit));
onMounted(fit);
defineExpose({ focus: () => area.value?.focus() });
</script>

<template>
  <textarea ref="area" class="wy-source-text" :value="modelValue" spellcheck="false" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"></textarea>
</template>
