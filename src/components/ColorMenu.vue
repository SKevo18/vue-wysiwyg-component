<script setup lang="ts">
// fixed colour values so mail clients show them as written
import type { Editor } from "@tiptap/core";
import { Check } from "@lucide/vue";
import { useEditorContext } from "../editor/context";

const props = defineProps<{ editor: Editor; color: string; highlight: string }>();
const emit = defineEmits<{ done: [] }>();
const ctx = useEditorContext();
const t = ctx.t;

const TEXT = [
  { id: "default", value: "" },
  { id: "gray", value: "#6b7280" },
  { id: "red", value: "#dc2626" },
  { id: "orange", value: "#ea580c" },
  { id: "yellow", value: "#ca8a04" },
  { id: "green", value: "#16a34a" },
  { id: "blue", value: "#2563eb" },
  { id: "purple", value: "#9333ea" },
  { id: "pink", value: "#db2777" },
];
const MARKS = [
  { id: "none", value: "" },
  { id: "yellow", value: "#fef08a" },
  { id: "green", value: "#bbf7d0" },
  { id: "blue", value: "#bfdbfe" },
  { id: "purple", value: "#e9d5ff" },
  { id: "pink", value: "#fbcfe8" },
  { id: "red", value: "#fecaca" },
];

function setColor(v: string) {
  const c = props.editor.chain().focus();
  (v ? c.setColor(v) : c.unsetColor()).run();
  emit("done");
}

function setHighlight(v: string) {
  const c = props.editor.chain().focus();
  (v ? c.setHighlight({ color: v }) : c.unsetHighlight()).run();
  emit("done");
}
</script>

<template>
  <div class="wy-colors">
    <template v-if="ctx.config.base.color">
      <div class="wy-menu-heading">{{ t("colors.text") }}</div>
      <div class="wy-swatches" role="group" :aria-label="t('colors.text')">
        <button v-for="c in TEXT" :key="c.id" type="button" class="wy-swatch is-text" :style="{ color: c.value || 'var(--vc-fg)' }" :title="t(`colors.${c.id}`)" :aria-label="t(`colors.${c.id}`)" :aria-pressed="color === c.value" @mousedown.prevent @click="setColor(c.value)">
          A<Check v-if="color === c.value" class="wy-swatch-check" :size="12" />
        </button>
      </div>
    </template>
    <template v-if="ctx.config.base.highlight">
      <div class="wy-menu-heading">{{ t("colors.background") }}</div>
      <div class="wy-swatches" role="group" :aria-label="t('colors.background')">
        <button v-for="c in MARKS" :key="c.id" type="button" class="wy-swatch" :class="{ 'is-none': !c.value }" :style="{ background: c.value || undefined }" :title="t(`colors.${c.id}`)" :aria-label="t(`colors.${c.id}`)" :aria-pressed="highlight === c.value" @mousedown.prevent @click="setHighlight(c.value)">
          <Check v-if="highlight === c.value" class="wy-swatch-check" :size="12" />
        </button>
      </div>
    </template>
  </div>
</template>
