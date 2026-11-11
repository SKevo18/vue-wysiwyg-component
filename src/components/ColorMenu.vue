<script setup lang="ts">
// markdown colours with palette tokens (themed through --vc-color-*/--vc-bg-*); html keeps fixed values so mail
// clients show them as written. `block` picks a block colour instead of marking the selection.
import { computed } from "vue";
import type { Editor } from "@tiptap/core";
import { Check, RotateCcw } from "@lucide/vue";
import { PALETTE, tokenCss } from "../core/colors";
import { useEditorContext } from "../editor/context";

const props = defineProps<{ editor: Editor; color: string; highlight: string; block?: boolean }>();
const emit = defineEmits<{ done: []; pick: [token: string | null] }>();
const ctx = useEditorContext();
const t = ctx.t;
const html = ctx.config.format === "html" && !props.block;

interface Swatch {
  id: string;
  value: string;
  css: string;
}

const HTML_TEXT: Swatch[] = [
  { id: "default", value: "", css: "" },
  { id: "gray", value: "#6b7280", css: "#6b7280" },
  { id: "red", value: "#dc2626", css: "#dc2626" },
  { id: "orange", value: "#ea580c", css: "#ea580c" },
  { id: "yellow", value: "#ca8a04", css: "#ca8a04" },
  { id: "green", value: "#16a34a", css: "#16a34a" },
  { id: "blue", value: "#2563eb", css: "#2563eb" },
  { id: "purple", value: "#9333ea", css: "#9333ea" },
  { id: "pink", value: "#db2777", css: "#db2777" },
];
const HTML_MARKS: Swatch[] = [
  { id: "none", value: "", css: "" },
  { id: "yellow", value: "#fef08a", css: "#fef08a" },
  { id: "green", value: "#bbf7d0", css: "#bbf7d0" },
  { id: "blue", value: "#bfdbfe", css: "#bfdbfe" },
  { id: "purple", value: "#e9d5ff", css: "#e9d5ff" },
  { id: "pink", value: "#fbcfe8", css: "#fbcfe8" },
  { id: "red", value: "#fecaca", css: "#fecaca" },
];
const TOKEN_TEXT: Swatch[] = [{ id: "default", value: "", css: "" }, ...PALETTE.map((n) => ({ id: n, value: n, css: tokenCss(n)! }))];
const TOKEN_MARKS: Swatch[] = [{ id: "none", value: "", css: "" }, ...PALETTE.map((n) => ({ id: n, value: `${n}_bg`, css: tokenCss(`${n}_bg`)! }))];

const text = html ? HTML_TEXT : TOKEN_TEXT;
const marks = html ? HTML_MARKS : TOKEN_MARKS;
const showText = props.block || ctx.config.base.color;
const showMarks = props.block || ctx.config.base.highlight;
const colored = computed(() => !!(props.color || props.highlight));

function setColor(v: string) {
  if (props.block) emit("pick", v || null);
  else {
    const c = props.editor.chain().focus();
    (v ? c.setColor(v) : c.unsetColor()).run();
  }
  emit("done");
}

function setHighlight(v: string) {
  if (props.block) emit("pick", v || null);
  else {
    const c = props.editor.chain().focus();
    (v ? c.setHighlight({ color: v }) : c.unsetHighlight()).run();
  }
  emit("done");
}

function reset() {
  if (props.block) emit("pick", null);
  else {
    let c = props.editor.chain().focus();
    if (ctx.config.base.color) c = c.unsetColor();
    if (ctx.config.base.highlight) c = c.unsetHighlight();
    c.run();
  }
  emit("done");
}
</script>

<template>
  <div class="wy-colors" role="menu" :aria-label="t('toolbar.color')">
    <template v-if="showText">
      <div class="wy-menu-heading">{{ t("colors.text") }}</div>
      <div class="wy-swatches" role="group" :aria-label="t('colors.text')">
        <button
          v-for="c in text"
          :key="c.id"
          type="button"
          role="menuitemradio"
          class="wy-swatch is-text"
          :style="{ color: c.css || 'var(--vc-fg)' }"
          :title="t(`colors.${c.id}`)"
          :aria-label="t(`colors.${c.id}`)"
          :aria-checked="color === c.value"
          @mousedown.prevent
          @click="setColor(c.value)"
        >
          A<Check v-if="color === c.value" class="wy-swatch-check" :size="12" />
        </button>
      </div>
    </template>
    <template v-if="showMarks">
      <div class="wy-menu-heading">{{ t("colors.background") }}</div>
      <div class="wy-swatches" role="group" :aria-label="t('colors.background')">
        <button
          v-for="c in marks"
          :key="c.id"
          type="button"
          role="menuitemradio"
          class="wy-swatch"
          :class="{ 'is-none': !c.value }"
          :style="{ background: c.css || undefined }"
          :title="t(`colors.${c.id}`)"
          :aria-label="t(`colors.${c.id}`)"
          :aria-checked="highlight === c.value"
          @mousedown.prevent
          @click="setHighlight(c.value)"
        >
          <Check v-if="highlight === c.value" class="wy-swatch-check" :size="12" />
        </button>
      </div>
    </template>
    <button type="button" role="menuitem" class="wy-menu-item wy-colors-reset" :aria-disabled="!colored || undefined" @mousedown.prevent @click="colored && reset()">
      <RotateCcw class="wy-menu-icon" :size="15" aria-hidden="true" />{{ t("colors.reset") }}
    </button>
  </div>
</template>
