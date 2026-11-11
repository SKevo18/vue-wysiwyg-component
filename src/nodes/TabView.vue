<script setup lang="ts">
// one tab of a tabs block, hidden unless it is the shown one. its label lives in the strip of TabsView. the shown
// tab depends on the selection, which does not re-render this view, so it is re-read on every transaction
import { onBeforeUnmount, onMounted, ref } from "vue";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { activeSection } from "../builtins/sections";

const props = defineProps(nodeViewProps);
const shown = ref(true);

function sync() {
  const pos = props.getPos();
  if (typeof pos !== "number") return;
  const $pos = props.editor.state.doc.resolve(pos);
  shown.value = activeSection(props.editor.state, $pos.before()) === $pos.index();
}

sync();
onMounted(() => props.editor.on("transaction", sync));
onBeforeUnmount(() => props.editor.off("transaction", sync));
</script>

<template>
  <NodeViewWrapper as="div" class="wy-tab-panel" :class="{ 'is-hidden': !shown }" role="tabpanel">
    <NodeViewContent class="wy-tab-body" />
  </NodeViewWrapper>
</template>
