<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, ref, watch } from "vue";
import { renderMath } from "../core/math";
import { contextOf } from "../editor/context";
import type { MathEdit } from "../types";
import { applyMathEdit } from "./mathField";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const palettes = ctx.math.filter((m) => m.palette);
const { selected, editing, startEdit, finishEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
const area = ref<HTMLTextAreaElement | null>(null);
const tex = computed<string>(() => props.node.attrs.tex ?? "");
const apply = (edit: MathEdit) => applyMathEdit(area, tex.value, (v) => update({ tex: v }), edit);
const html = computed(() => (tex.value.trim() ? renderMath(tex.value.trim(), true) : ""));

watch(editing, async (on) => {
  if (on) {
    await nextTick();
    area.value?.focus();
    area.value?.setSelectionRange(tex.value.length, tex.value.length);
  } else if (!tex.value.trim()) {
    remove();
  }
});

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    finishEdit();
  }
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-math">
    <BlockFrame :label="t('math.label')" :selected="selected" :editing="editing" :readonly="readonly" :copy-text="copyText" @edit="startEdit" @delete="remove">
      <div v-if="!editing" class="wy-block-rendered" @click="startEdit">
        <div v-if="html" class="wy-math-block" v-html="html"></div>
        <p v-else class="wy-block-empty">{{ t("math.empty") }}</p>
      </div>
      <div v-else class="wy-math-editor" contenteditable="false" data-block-portal @mousedown.stop>
        <textarea ref="area" class="wy-input is-mono" :value="tex" :placeholder="t('math.placeholder')" :aria-label="t('math.tex')" spellcheck="false" @input="update({ tex: ($event.target as HTMLTextAreaElement).value })" @keydown="onKey"></textarea>
        <div class="wy-math-block" v-html="html"></div>
        <div v-if="palettes.length" class="wy-math-palette"><component :is="p.palette" v-for="(p, i) in palettes" :key="i" :apply="apply" /></div>
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
