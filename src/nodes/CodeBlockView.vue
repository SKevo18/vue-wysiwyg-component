<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref } from "vue";
import { highlightCode } from "../core/highlight";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, remove, update, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const language = computed<string>(() => props.node.attrs.language ?? "");
const editing = ref(false);
const highlighted = computed(() => (editing.value ? "" : highlightCode(props.node.textContent, language.value)));
const languages = ctx.config.base.codeBlocks || [];
const listId = `wy-code-languages-${Math.random().toString(36).slice(2, 8)}`;
const label = computed(() => {
  for (const h of ctx.codeBlock) {
    const l = h.label?.(props.node);
    if (l) return l;
  }
  return language.value || t("code.label");
});

function syncEditing() {
  const pos = props.getPos();
  if (typeof pos !== "number") return;
  const { from, to } = props.editor.state.selection;
  editing.value = props.editor.isFocused && from > pos && to < pos + props.node.nodeSize;
}
props.editor.on("selectionUpdate", syncEditing);
props.editor.on("blur", syncEditing);
props.editor.on("focus", syncEditing);
onBeforeUnmount(() => {
  props.editor.off("selectionUpdate", syncEditing);
  props.editor.off("blur", syncEditing);
  props.editor.off("focus", syncEditing);
});

function setLanguage(e: Event) {
  update({ language: (e.target as HTMLInputElement).value.trim().toLowerCase() || null });
}

function commit(e: Event) {
  setLanguage(e);
  menu.value = false;
  props.editor.commands.focus();
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-code" :class="{ 'is-editing': editing }">
    <BlockFrame :label="label" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <pre class="wy-code"><code v-if="!editing" class="wy-code-highlight" aria-hidden="true" contenteditable="false" v-html="highlighted"></code><NodeViewContent as="code" :class="language ? `language-${language}` : ''" spellcheck="false" /></pre>
      <div v-for="(h, i) in ctx.codeBlock.filter((x) => x.below)" :key="i" class="wy-code-below" contenteditable="false" data-block-portal @mousedown.stop>
        <component :is="h.below" v-bind="props" />
      </div>
      <template #menu>
        <BlockMenu :open="menu" :convert="props" @close="menu = false">
          <label class="wy-field">
            <span class="wy-label">{{ t("code.language") }}</span>
            <input class="wy-input is-sm" :value="language" :placeholder="t('code.languagePlaceholder')" spellcheck="false" :list="listId" @change="setLanguage" @keydown.enter.prevent="commit" />
          </label>
          <datalist :id="listId">
            <option v-for="l in languages" :key="l" :value="l"></option>
          </datalist>
          <component :is="h.menu" v-for="(h, i) in ctx.codeBlock.filter((x) => x.menu)" :key="i" v-bind="props" />
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
