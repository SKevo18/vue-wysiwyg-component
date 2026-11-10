<script setup lang="ts">
import type { ResolvedTarget } from "../editor/convert";
import { useEditorContext } from "../editor/context";

defineProps<{ targets: ResolvedTarget[] }>();
const emit = defineEmits<{ pick: [target: string] }>();
const ctx = useEditorContext();

function label(target: ResolvedTarget): string {
  return ctx.text(target.label, `convert.targets.${target.id}`) || ctx.text("", `slash.items.${target.id}.label`) || target.id;
}
</script>

<template>
  <button v-for="target in targets" :key="target.id" type="button" role="menuitem" class="wy-menu-item" :data-convert="target.id" @mousedown.prevent @click="emit('pick', target.id)">
    <component :is="target.icon" v-if="target.icon" class="wy-menu-icon" :size="16" aria-hidden="true" />
    <span>{{ label(target) }}</span>
  </button>
</template>
