<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { nextTick, ref, watch } from "vue";
import { contextOf } from "../editor/context";
import { markFresh } from "../editor/fresh";
import { isInCell } from "../editor/tables";
import { useBlockNode } from "../blocks/useBlockNode";
import AnchoredPopover from "../components/AnchoredPopover.vue";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, editing, startEdit, stopEdit, finishEdit, update, readonly, onKeydown } = useBlockNode(props);
const image = ref<HTMLImageElement | null>(null);
const altInput = ref<HTMLInputElement | null>(null);
const canFigure = ref(false);

watch(editing, async (on) => {
  if (!on) return;
  const pos = props.getPos();
  canFigure.value = !!props.editor.schema.nodes.figure && typeof pos === "number" && !isInCell(props.editor.state.doc.resolve(pos));
  await nextTick();
  altInput.value?.focus();
});

function toFigure() {
  const pos = props.getPos();
  if (typeof pos !== "number") return;
  const { src, alt, title, width, align } = props.node.attrs;
  stopEdit();
  markFresh("figure");
  props.editor
    .chain()
    .focus()
    .insertContentAt({ from: pos, to: pos + props.node.nodeSize }, { type: "figure", attrs: { src, alt, caption: title || null, width, align } })
    .run();
}
</script>

<template>
  <NodeViewWrapper as="span" class="wy-inline-atom" :class="{ 'is-selected': selected, 'is-editing': editing }">
    <img ref="image" :src="node.attrs.src" :alt="node.attrs.alt || ''" :title="node.attrs.title || undefined" :style="node.attrs.width ? `width:${node.attrs.width}%` : undefined" loading="lazy" draggable="false" @click="readonly || startEdit()" />
    <AnchoredPopover v-if="editing" :anchor="image" class="wy-popover" @escape="onKeydown">
      <label class="wy-field">
        <span class="wy-label">{{ t("image.alt") }}</span>
        <input ref="altInput" class="wy-input" type="text" :value="node.attrs.alt || ''" :placeholder="t('image.altPlaceholder')" @input="update({ alt: ($event.target as HTMLInputElement).value || null })" @keydown.enter.prevent="finishEdit" />
      </label>
      <label class="wy-field">
        <span class="wy-label">{{ t("image.title") }}</span>
        <input class="wy-input" type="text" :value="node.attrs.title || ''" @input="update({ title: ($event.target as HTMLInputElement).value || null })" @keydown.enter.prevent="finishEdit" />
      </label>
      <button v-if="canFigure" type="button" class="wy-btn is-sm" @click="toFigure">{{ t("image.toFigure") }}</button>
    </AnchoredPopover>
  </NodeViewWrapper>
</template>
