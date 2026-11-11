<script setup lang="ts">
// the tab strip over the shown tab (TabView hides the others). the shown tab follows the caret; its label is an
// input in the strip, the other tabs are buttons that move the caret into them. the move, delete and add tools
// show on hover or while the caret is in the block. Enter or ArrowDown in the label moves into the tab
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "@lucide/vue";
import { activeSection, addSection, moveSection, removeSection, selectSection, setSectionLabel } from "../builtins/sections";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, remove, copyText, readonly } = useBlockNode(props);
const labelInput = ref<HTMLInputElement[]>([]);

const labels = computed(() => {
  const out: string[] = [];
  props.node.forEach((tab) => out.push(String(tab.attrs.label ?? "")));
  return out;
});
// selection-only transactions do not re-render the node view, so the strip re-reads the shown tab on each one
const tick = ref(0);
const bump = () => tick.value++;
onMounted(() => props.editor.on("transaction", bump));
onBeforeUnmount(() => props.editor.off("transaction", bump));
const active = computed(() => {
  void tick.value;
  const pos = props.getPos();
  return typeof pos === "number" ? activeSection(props.editor.state, pos) : 0;
});
const inside = computed(() => {
  void tick.value;
  const pos = props.getPos();
  const { from } = props.editor.state.selection;
  return typeof pos === "number" && from > pos && from < pos + props.node.nodeSize;
});
const untitled = (i: number) => t("tabs.untitled", { n: i + 1 });

function withPos(fn: (pos: number) => void) {
  const pos = props.getPos();
  if (typeof pos === "number") fn(pos);
}

function intoContent(e: KeyboardEvent) {
  if (e.key !== "Enter" && e.key !== "ArrowDown") return;
  e.preventDefault();
  withPos((pos) => selectSection(props.editor, pos, active.value));
}

function addTab() {
  withPos((pos) => addSection(props.editor, pos, labels.value.length));
  void nextTick(() => labelInput.value[0]?.focus());
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-tabs">
    <BlockFrame :label="t('tabs.label')" :selected="selected" :editing="inside" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove">
      <div class="wy-tabs">
        <div class="wy-tabs-strip" role="tablist" contenteditable="false">
          <template v-for="(label, i) in labels" :key="i">
            <input
              v-if="i === active && !readonly"
              ref="labelInput"
              class="wy-tab is-active wy-tab-input"
              role="tab"
              aria-selected="true"
              :value="label"
              :size="Math.max(4, (label || untitled(i)).length + 1)"
              :placeholder="untitled(i)"
              :aria-label="t('tabs.labelField')"
              @input="withPos((pos) => setSectionLabel(editor, pos, i, ($event.target as HTMLInputElement).value))"
              @keydown="intoContent"
            />
            <button v-else type="button" class="wy-tab" :class="{ 'is-active': i === active }" role="tab" :aria-selected="i === active" @mousedown.prevent @click="withPos((pos) => selectSection(editor, pos, i))">
              {{ label || untitled(i) }}
            </button>
          </template>
          <span v-if="!readonly" class="wy-tabs-tools">
            <button v-tooltip="t('tabs.moveLeft')" type="button" class="wy-icon-btn" :aria-label="t('tabs.moveLeft')" :disabled="active === 0" @mousedown.prevent @click="withPos((pos) => moveSection(editor, pos, active, -1))"><ChevronLeft :size="14" /></button>
            <button v-tooltip="t('tabs.moveRight')" type="button" class="wy-icon-btn" :aria-label="t('tabs.moveRight')" :disabled="active === labels.length - 1" @mousedown.prevent @click="withPos((pos) => moveSection(editor, pos, active, 1))"><ChevronRight :size="14" /></button>
            <button v-tooltip="t('tabs.remove')" type="button" class="wy-icon-btn is-danger" :aria-label="t('tabs.remove')" :disabled="labels.length < 2" @mousedown.prevent @click="withPos((pos) => removeSection(editor, pos, active))"><Trash2 :size="14" /></button>
            <button v-tooltip="t('tabs.add')" type="button" class="wy-icon-btn" :aria-label="t('tabs.add')" @mousedown.prevent @click="addTab"><Plus :size="14" /></button>
          </span>
        </div>
        <NodeViewContent class="wy-tabs-panels" />
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
