<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref } from "vue";
import { TextSelection } from "@tiptap/pm/state";
import type { DiagramLanguage } from "../types";
import DiagramView from "./DiagramView.vue";
import MediaTools from "./MediaTools.vue";
import { rightAnchored, startMediaResize } from "./media";
import { highlightCode } from "../core/highlight";
import { DIAGRAM_ALIGNS, diagramLayout, withDiagramLayout, type DiagramLayout } from "../core/media";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";

// a single click on a diagram opens its source after this long, unless it turns into a double click (enlarge)
const DOUBLE_CLICK_WAIT = 250;

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, remove, update, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const language = computed<string>(() => props.node.attrs.language ?? "");
const editing = ref(false);
const highlighted = computed(() => (editing.value ? "" : highlightCode(props.node.textContent, language.value)));
const diagram = computed(() => ((ctx.config.base.diagrams as string[]).includes(language.value) ? (language.value as DiagramLanguage) : null));
// a diagram hides its source until the block is selected or the caret is in it
const sourceShown = computed(() => !diagram.value || editing.value || selected.value || !props.node.textContent.trim());
const layout = computed(() => diagramLayout(String(props.node.attrs.meta ?? "")));
const shownAlign = computed(() => layout.value.align ?? "center");
// like a figure being edited: the diagram is selected or its source is open
const toolsFocused = ref(false);
const mediaTools = computed(() => !!diagram.value && !readonly.value && (selected.value || editing.value || toolsFocused.value));
const diagramBox = ref<HTMLElement | null>(null);
const diagramView = ref<InstanceType<typeof DiagramView> | null>(null);
let clickTimer = 0;
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
  window.clearTimeout(clickTimer);
});

function editSource() {
  const pos = props.getPos();
  if (readonly.value || typeof pos !== "number") return;
  const view = props.editor.view;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos + props.node.nodeSize - 1)));
  view.focus();
}

function onDiagramClick(e: MouseEvent) {
  window.clearTimeout(clickTimer);
  if (e.detail === 1) clickTimer = window.setTimeout(editSource, DOUBLE_CLICK_WAIT);
}

function zoomDiagram() {
  window.clearTimeout(clickTimer);
  const shown = diagramView.value;
  if (shown?.svg) ctx.zoom({ src: "", svg: shown.svg, alt: t("diagram.alt") });
  else if (shown?.img) ctx.zoom({ src: shown.img, alt: t("diagram.alt") });
}

// an attribute step keeps the block selection and the caret where they are
function setLayout(next: Partial<DiagramLayout>) {
  const pos = props.getPos();
  if (typeof pos !== "number") return;
  const meta = withDiagramLayout(String(props.node.attrs.meta ?? ""), { ...layout.value, ...next });
  props.editor.view.dispatch(props.editor.state.tr.setNodeAttribute(pos, "meta", meta));
}

function startResize(e: PointerEvent) {
  if (diagramBox.value) startMediaResize(e, diagramBox.value, shownAlign.value, (width) => setLayout({ width }));
}

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
  <NodeViewWrapper as="div" class="wy-node wy-node-code" :class="{ 'is-editing': editing, 'is-diagram': diagram, 'is-source-hidden': !sourceShown }">
    <BlockFrame :label="label" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <pre class="wy-code"><code v-if="!editing" class="wy-code-highlight" aria-hidden="true" contenteditable="false" v-html="highlighted"></code><NodeViewContent as="code" :class="language ? `language-${language}` : ''" spellcheck="false" /></pre>
      <div
        v-if="diagram"
        ref="diagramBox"
        class="wy-code-diagram"
        :class="[`wy-align-${shownAlign}`, { 'has-width': layout.width }]"
        :style="layout.width ? { '--wy-figure-width': `${layout.width}%` } : undefined"
        contenteditable="false"
        @click="onDiagramClick"
        @dblclick="zoomDiagram"
      >
        <DiagramView ref="diagramView" :language="diagram" :source="node.textContent" :server="ctx.config.base.plantumlServer" :services="ctx.services" :t="t" />
        <span v-if="mediaTools" class="wy-figure-resize" :class="{ 'is-left': rightAnchored(shownAlign) }" role="separator" :aria-label="t('image.resize')" :title="t('image.resize')" @pointerdown="startResize" @click.stop></span>
      </div>
      <MediaTools
        v-if="mediaTools"
        :box="diagramBox"
        :aligns="DIAGRAM_ALIGNS"
        :align="shownAlign"
        :width="layout.width ?? 100"
        :resettable="!!layout.width || !!layout.align"
        zoomable
        @align="(a) => setLayout({ align: a as DiagramLayout['align'] })"
        @width="(w) => setLayout({ width: w })"
        @reset="setLayout({ width: null, align: null })"
        @zoom="zoomDiagram"
        @focusin="toolsFocused = true"
        @focusout="toolsFocused = ($event.currentTarget as HTMLElement).contains($event.relatedTarget as Node | null)"
      />
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
