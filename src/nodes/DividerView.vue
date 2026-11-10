<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref } from "vue";
import { Check } from "@lucide/vue";
import { DIVIDER_COLORS, DIVIDER_DESIGNS, DIVIDER_GLYPHS, DIVIDER_STYLES, DIVIDER_WIDTHS, dividerOrnament, dividerStyle, validChar, type DividerAttrs } from "../core/attrs";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, remove, update, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const attrs = computed(() => props.node.attrs as DividerAttrs);
const ornament = computed(() => dividerOrnament(attrs.value));
const look = computed(() => dividerStyle(attrs.value));
const customColor = computed(() => (attrs.value.color?.startsWith("#") ? attrs.value.color : ""));
const charInvalid = ref(false);

function setChar(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim();
  charInvalid.value = v !== "" && !validChar(v);
  if (!charInvalid.value) update({ char: v || null });
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-divider">
    <BlockFrame :label="t('divider.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <div class="wy-divider-hit">
        <hr v-if="!ornament" class="wy-divider" :style="look" />
        <div v-else class="wy-divider has-ornament" role="separator" :style="look">
          <span class="wy-divider-ornament" aria-hidden="true">{{ ornament }}</span>
        </div>
      </div>
      <template #menu>
        <BlockMenu :open="menu" class="wy-divider-menu" @close="menu = false">
          <div class="wy-menu-heading">{{ t("divider.line") }}</div>
          <div class="wy-menu-split">
            <div class="wy-seg" role="group" :aria-label="t('divider.line')">
              <button v-for="s in DIVIDER_STYLES" :key="s" v-tooltip="t(`divider.styles.${s}`)" type="button" :aria-label="t(`divider.styles.${s}`)" :aria-pressed="attrs.style === s" @click="update({ style: s })">
                <span class="wy-line-sample" :style="{ borderTopStyle: s, borderTopWidth: s === 'double' ? '5px' : '3px' }" aria-hidden="true"></span>
              </button>
            </div>
            <div class="wy-seg" role="group" :aria-label="t('divider.width')">
              <button v-for="w in DIVIDER_WIDTHS" :key="w" type="button" :aria-pressed="attrs.width === w" @click="update({ width: w })">{{ t("divider.widthPx", { n: w }) }}</button>
            </div>
          </div>
          <div class="wy-menu-heading">{{ t("divider.color") }}</div>
          <div class="wy-swatches" role="group" :aria-label="t('divider.color')">
            <button v-tooltip="t('divider.defaultColor')" type="button" class="wy-swatch is-round is-default" :aria-pressed="!attrs.color" :aria-label="t('divider.defaultColor')" @click="update({ color: null })">
              <Check v-if="!attrs.color" :size="12" />
            </button>
            <button v-for="c in DIVIDER_COLORS" :key="c" v-tooltip="t(`divider.colors.${c}`)" type="button" class="wy-swatch is-round" :style="{ background: `var(--vc-tint-${c})` }" :aria-pressed="attrs.color === c" :aria-label="t(`divider.colors.${c}`)" @click="update({ color: c })">
              <Check v-if="attrs.color === c" class="wy-swatch-check" :size="12" />
            </button>
            <label v-tooltip="t('divider.customColor')" class="wy-swatch is-round is-custom" :style="customColor ? { '--wy-sw': customColor } : undefined">
              <Check v-if="customColor" class="wy-swatch-check" :size="12" />
              <input type="color" class="wy-sr-only" :value="customColor || '#808080'" :aria-label="t('divider.customColor')" @change="update({ color: ($event.target as HTMLInputElement).value })" />
            </label>
          </div>
          <div class="wy-menu-heading">{{ t("divider.design") }}</div>
          <button v-for="d in DIVIDER_DESIGNS" :key="d" type="button" class="wy-menu-item" role="menuitemradio" :aria-pressed="!attrs.char && attrs.design === d" @click="update({ design: d, char: null })">
            <span class="wy-menu-sample" aria-hidden="true">{{ d === "none" ? "-" : DIVIDER_GLYPHS[d] }}</span>
            <span>{{ t(`divider.designs.${d}`) }}</span>
          </button>
          <label class="wy-field">
            <span class="wy-label">{{ t("divider.customChar") }}</span>
            <input class="wy-input is-sm" :value="attrs.char ?? ''" maxlength="16" spellcheck="false" :aria-invalid="charInvalid || undefined" @change="setChar" @keydown.enter.prevent="setChar" />
            <span v-if="charInvalid" class="wy-menu-hint is-danger">{{ t("divider.charInvalid") }}</span>
          </label>
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
