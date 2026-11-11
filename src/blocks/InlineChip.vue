<script setup lang="ts">
// the wrapper of an inline block's view: the chip look, its hover and selection outline
import { NodeViewWrapper } from "@tiptap/vue-3";

withDefaults(defineProps<{ selected?: boolean; editing?: boolean }>(), { selected: false, editing: false });
</script>

<template>
  <NodeViewWrapper as="span" class="wy-inline-atom wy-chip-atom" :class="{ 'is-selected': selected, 'is-editing': editing }"><slot /></NodeViewWrapper>
</template>
