<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, ref } from "vue";
import { Heading } from "@lucide/vue";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";
import CalloutIcon from "./CalloutIcon.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const kinds = ctx.config.base.callouts;
const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
const menu = ref(false);
const type = computed<string>(() => props.node.attrs.type || kinds[0] || "note");
const kindLabel = (k: string) => (ctx.has(`callout.types.${k}`) ? t(`callout.types.${k}`) : k);
const titleInput = ref<HTMLInputElement | null>(null);
const titleFocused = ref(false);
const titled = computed(() => !!props.node.attrs.title || titleFocused.value);

function setType(next: string) {
  update({ type: next });
  menu.value = false;
}

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
      <div class="wy-callout" :data-variant="type" :class="{ 'has-title': titled }">
        <div class="wy-callout-title" contenteditable="false">
          <button v-tooltip="t('callout.changeType')" type="button" class="wy-callout-icon" data-block-more :aria-label="t('callout.changeType')" :disabled="readonly" @mousedown.prevent @click="menu = !menu">
            <CalloutIcon :type="type" />
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
      <template #menu>
        <BlockMenu :open="menu" :convert="props" @close="menu = false">
          <button v-if="!titled && !readonly" type="button" class="wy-menu-item" @click="addTitle"><Heading class="wy-menu-icon" :size="16" />{{ t("callout.addTitle") }}</button>
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
