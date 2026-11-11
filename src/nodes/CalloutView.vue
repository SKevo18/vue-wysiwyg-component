<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Heading } from "@lucide/vue";
import { calloutStyle } from "../core/palette";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import AnchoredPopover from "../components/AnchoredPopover.vue";
import EmojiPicker from "../components/EmojiPicker.vue";
import PalettePicker from "../components/PalettePicker.vue";
import { vTooltip } from "../components/tooltip";
import CalloutIcon from "./CalloutIcon.vue";
import { parseBlockAttrs } from "../core/attrs";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const kinds = ctx.config.base.callouts;
const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
const menu = ref(false);
const picker = ref(false);
const iconButton = ref<HTMLElement | null>(null);
const type = computed<string>(() => props.node.attrs.type || kinds[0] || "note");
const icon = computed<string>(() => props.node.attrs.icon || "");
const color = computed<string | null>(() => props.node.attrs.color ?? null);
const kindLabel = (k: string) => (ctx.has(`callout.types.${k}`) ? t(`callout.types.${k}`) : k);
const titleInput = ref<HTMLInputElement | null>(null);
const titleFocused = ref(false);
const titled = computed(() => !!props.node.attrs.title || titleFocused.value);

function setType(next: string) {
  update({ type: next });
  menu.value = false;
}

function setIcon(next: string) {
  update({ icon: next });
  picker.value = false;
  props.editor.commands.focus();
}

const own = ref("");
const validIcon = (v: string) => !!v && parseBlockAttrs({ icon: v }) !== null;

function applyOwn() {
  const v = own.value.trim();
  if (validIcon(v)) setIcon(v);
}

function setColor(next: string | null) {
  update({ color: next });
}

function onDocDown(e: MouseEvent) {
  const target = e.target as Element;
  if (!target.closest?.(".wy-callout-picker") && !iconButton.value?.contains(target)) picker.value = false;
}
watch(picker, (open) => (open ? document.addEventListener("mousedown", onDocDown, true) : document.removeEventListener("mousedown", onDocDown, true)));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));

async function addTitle() {
  menu.value = false;
  titleFocused.value = true;
  await nextTick();
  titleInput.value?.focus();
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-callout">
    <BlockFrame :label="kindLabel(type)" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <div class="wy-callout" :data-variant="type" :data-color="color || undefined" :style="calloutStyle(color)" :class="{ 'has-title': titled, 'has-icon': !!icon }">
        <div class="wy-callout-title" contenteditable="false">
          <button
            ref="iconButton"
            v-tooltip="t('callout.changeIcon')"
            type="button"
            class="wy-callout-icon"
            :aria-label="t('callout.changeIcon')"
            :aria-expanded="picker"
            :disabled="readonly"
            @mousedown.prevent
            @click="picker = !picker"
          >
            <span v-if="icon" class="wy-callout-emoji">{{ icon }}</span>
            <CalloutIcon v-else :type="type" />
          </button>
          <input
            v-show="titled"
            ref="titleInput"
            class="wy-callout-title-input"
            :value="node.attrs.title"
            :placeholder="kindLabel(type)"
            :size="Math.max(3, String(node.attrs.title || kindLabel(type)).length + 1)"
            :aria-label="t('callout.title')"
            :readonly="readonly"
            @input="update({ title: ($event.target as HTMLInputElement).value })"
            @focus="titleFocused = true"
            @blur="titleFocused = false"
            @keydown="onHeaderKey"
          />
        </div>
        <NodeViewContent class="wy-callout-body" />
      </div>
      <AnchoredPopover v-if="picker" :anchor="iconButton" class="wy-menu wy-callout-picker" @escape="picker = false" @close="picker = false">
        <EmojiPicker :value="icon" :t="t" @pick="setIcon">
          <template #footer>
            <form class="wy-emoji-own" @submit.prevent="applyOwn">
              <input v-model="own" class="wy-input is-sm" maxlength="32" :placeholder="t('callout.ownIcon')" :aria-label="t('callout.ownIcon')" />
              <button type="submit" class="wy-btn is-sm" :disabled="!validIcon(own.trim())">{{ t("callout.useIcon") }}</button>
            </form>
            <button v-if="icon" type="button" class="wy-btn is-sm" @click="setIcon('')">{{ t("callout.defaultIcon") }}</button>
          </template>
        </EmojiPicker>
      </AnchoredPopover>
      <template #menu>
        <BlockMenu :open="menu" :convert="props" @close="menu = false">
          <button v-if="!titled && !readonly" type="button" class="wy-menu-item" @click="addTitle"><Heading class="wy-menu-icon" :size="16" />{{ t("callout.addTitle") }}</button>
          <PalettePicker :value="color" :t="t" @pick="setColor" />
          <div class="wy-menu-heading">{{ t("callout.kinds") }}</div>
          <button v-for="k in kinds" :key="k" type="button" class="wy-menu-item" :data-variant="k" :aria-pressed="k === type" role="menuitemradio" @click="setType(k)">
            <span class="wy-callout-swatch" :data-variant="k"><CalloutIcon :type="k" /></span>
            <span>{{ kindLabel(k) }}</span>
          </button>
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
