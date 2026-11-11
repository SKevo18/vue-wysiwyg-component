<script setup lang="ts">
import { Check } from "@lucide/vue";
import { PALETTE, paletteCss } from "../core/palette";
import { vTooltip } from "./tooltip";

const props = withDefaults(defineProps<{ value: string | null; t: (key: string) => string; text?: boolean }>(), { text: true });
const emit = defineEmits<{ pick: [token: string | null] }>();

const rows = [{ heading: "palette.background", tokens: PALETTE.map((p) => `${p}_bg`) }, ...(props.text ? [{ heading: "palette.text", tokens: [...PALETTE] }] : [])];
const name = (token: string) => props.t(`palette.${token.replace(/_bg$/, "")}`);
</script>

<template>
  <div class="wy-palette">
    <template v-for="row in rows" :key="row.heading">
      <div class="wy-menu-heading">{{ t(row.heading) }}</div>
      <div class="wy-palette-row" role="group" :aria-label="t(row.heading)">
        <button
          v-for="token in row.tokens"
          :key="token"
          v-tooltip="name(token)"
          type="button"
          class="wy-swatch"
          :class="token.endsWith('_bg') ? 'is-bg' : 'is-text'"
          :style="token.endsWith('_bg') ? { background: paletteCss(token) } : { color: paletteCss(token) }"
          :aria-label="name(token)"
          :aria-pressed="token === value"
          @mousedown.prevent
          @click="emit('pick', token)"
        >
          <Check v-if="token === value" :size="14" />
          <span v-else-if="!token.endsWith('_bg')" aria-hidden="true">A</span>
        </button>
      </div>
    </template>
    <button v-if="value" type="button" class="wy-menu-item" @mousedown.prevent @click="emit('pick', null)">{{ t("palette.default") }}</button>
  </div>
</template>
