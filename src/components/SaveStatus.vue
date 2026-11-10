<script setup lang="ts">
import { computed } from "vue";
import type { DraftStatus } from "../draft/useDraft";
import { useEditorContext } from "../editor/context";
import { vTooltip } from "./tooltip";

const props = defineProps<{ status: DraftStatus; dot?: boolean }>();
const ctx = useEditorContext();
const label = computed(() => (props.status === "none" ? "" : ctx.t(`draft.${props.status}`)));
</script>

<template>
  <span v-if="status !== 'none'" v-tooltip="dot ? label : undefined" class="wy-save-status" :class="{ 'is-bad': status === 'offline' || status === 'error', 'is-dot': dot }" role="status" :aria-label="label">
    <span class="wy-draft-dot" :data-status="status" aria-hidden="true"></span>
    <span v-if="!dot" class="wy-save-label" aria-hidden="true">{{ label }}</span>
  </span>
</template>
