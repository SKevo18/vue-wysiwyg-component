<script setup lang="ts">
import { CALLOUT_ICONS } from "../core/callouts";

defineProps<{ type: string; size?: number }>();
</script>

<template>
  <svg viewBox="0 0 24 24" :width="size ?? 16" :height="size ?? 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <component :is="tag" v-for="([tag, attrs], i) in CALLOUT_ICONS[type] ?? CALLOUT_ICONS.note" :key="i" v-bind="attrs" />
  </svg>
</template>
