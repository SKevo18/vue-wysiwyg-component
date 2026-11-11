<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { ChevronRight } from "@lucide/vue";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-details">
    <BlockFrame :label="node.attrs.heading ? t('details.headingLabel', { n: node.attrs.heading }) : t('details.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove">
      <div class="wy-details" :data-open="node.attrs.open ? 'true' : 'false'" :data-heading="node.attrs.heading || undefined">
        <div class="wy-details-summary" contenteditable="false">
          <button
            v-tooltip="t(node.attrs.open ? 'details.openByDefault' : 'details.closedByDefault')"
            type="button"
            class="wy-details-toggle"
            :aria-label="t('details.toggleDefault')"
            :aria-pressed="!!node.attrs.open"
            :disabled="readonly"
            @mousedown.prevent
            @click="update({ open: !node.attrs.open })"
          >
            <ChevronRight :size="16" />
          </button>
          <input class="wy-details-title" :value="node.attrs.title" :placeholder="t('details.titlePlaceholder')" :aria-label="t('details.title')" :readonly="readonly" @input="update({ title: ($event.target as HTMLInputElement).value })" @keydown="onHeaderKey" />
        </div>
        <NodeViewContent class="wy-details-body" />
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
