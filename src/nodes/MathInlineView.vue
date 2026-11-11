<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, ref, watch } from "vue";
import { renderMath } from "../core/math";
import { contextOf } from "../editor/context";
import type { MathEdit } from "../types";
import { applyMathEdit } from "./mathField";
import { useBlockNode } from "../blocks/useBlockNode";
import AnchoredPopover from "../components/AnchoredPopover.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const palettes = ctx.math.filter((m) => m.palette);
const { selected, editing, startEdit, finishEdit, update, remove, readonly, onKeydown } = useBlockNode(props, { editOnInsert: true });
const anchor = ref<HTMLElement | null>(null);
const area = ref<HTMLTextAreaElement | null>(null);
const tex = computed<string>(() => props.node.attrs.tex ?? "");
const apply = (edit: MathEdit) => applyMathEdit(area, tex.value, (v) => update({ tex: v }), edit);
const html = computed(() => (tex.value.trim() ? renderMath(tex.value.trim(), false) : ""));

watch(editing, async (on) => {
  if (on) {
    await nextTick();
    area.value?.focus();
    area.value?.select();
  } else if (!tex.value.trim()) {
    remove();
  }
});

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    finishEdit();
  }
}
</script>

<template>
  <NodeViewWrapper as="span" class="wy-inline-atom" :class="{ 'is-selected': selected, 'is-editing': editing }">
    <span ref="anchor" class="wy-math-inline" :title="readonly ? undefined : t('math.edit')" @click="readonly || startEdit()">
      <span v-if="html" v-html="html"></span>
      <span v-else class="wy-muted">{{ t("math.empty") }}</span>
    </span>
    <AnchoredPopover v-if="editing" :anchor="anchor" class="wy-popover" :class="{ 'is-wide': palettes.length }" @escape="onKeydown" @close="finishEdit">
      <textarea ref="area" class="wy-input is-mono" rows="2" :value="tex" :placeholder="t('math.placeholder')" :aria-label="t('math.tex')" spellcheck="false" @input="update({ tex: ($event.target as HTMLTextAreaElement).value })" @keydown="onKey"></textarea>
      <span class="wy-math-preview" v-html="html"></span>
      <component :is="p.palette" v-for="(p, i) in palettes" :key="i" :apply="apply" />
    </AnchoredPopover>
  </NodeViewWrapper>
</template>
