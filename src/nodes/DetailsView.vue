<script setup lang="ts">
import { computed, ref } from "vue";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { NodeSelection } from "@tiptap/pm/state";
import { ChevronRight } from "@lucide/vue";
import { blockColorStyle } from "../core/colors";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, remove, update, copyText, readonly, onHeaderKey } = useBlockNode(props);
// a reader opens and closes it for themselves; the stored `open` is what everyone sees first
const readerOpen = ref<boolean | null>(null);
const open = computed(() => (readonly.value ? (readerOpen.value ?? !!props.node.attrs.open) : !!props.node.attrs.open));

function toggle() {
  if (readonly.value) {
    readerOpen.value = !open.value;
    return;
  }
  const pos = props.getPos();
  const { from, to } = props.editor.state.selection;
  // a caret in the body it hides moves onto the block
  if (open.value && typeof pos === "number" && from > pos && to < pos + props.node.nodeSize) {
    props.editor.view.dispatch(props.editor.state.tr.setSelection(NodeSelection.create(props.editor.state.doc, pos)));
  }
  update({ open: !open.value });
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-details">
    <BlockFrame :label="node.attrs.heading ? t('details.headingLabel', { n: node.attrs.heading }) : t('details.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove">
      <div class="wy-details" :data-open="open ? 'true' : 'false'" :data-heading="node.attrs.heading || undefined" :data-block-color="node.attrs.color || undefined" :style="blockColorStyle(node.attrs.color) ?? undefined">
        <div class="wy-details-summary" contenteditable="false">
          <button v-tooltip="t(open ? 'details.collapse' : 'details.expand')" type="button" class="wy-details-toggle" :aria-label="t(open ? 'details.collapse' : 'details.expand')" :aria-expanded="open" @mousedown.prevent @click="toggle">
            <ChevronRight :size="16" />
          </button>
          <input class="wy-details-title" :value="node.attrs.title" :placeholder="t('details.titlePlaceholder')" :aria-label="t('details.title')" :readonly="readonly" @input="update({ title: ($event.target as HTMLInputElement).value })" @keydown="onHeaderKey" />
        </div>
        <NodeViewContent v-show="open" class="wy-details-body" />
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
