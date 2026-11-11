<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import { scrollToHeading, tocEntries, type TocEntry } from "../editor/headings";
import { paletteCss } from "../core/palette";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import PalettePicker from "../components/PalettePicker.vue";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, update, remove, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const entries = shallowRef<TocEntry[]>(tocEntries(props.editor.state.doc));
const top = computed(() => Math.min(...entries.value.map((e) => e.level), 6));
const color = computed<string | null>(() => props.node.attrs.color ?? null);
const style = computed(() => {
  const c = color.value;
  if (!c) return undefined;
  return c.endsWith("_bg") ? { background: paletteCss(c) } : { "--wy-toc-color": paletteCss(c) };
});

function refresh({ transaction }: { transaction: { docChanged: boolean } }) {
  if (transaction.docChanged) entries.value = tocEntries(props.editor.state.doc);
}
props.editor.on("transaction", refresh);
onBeforeUnmount(() => props.editor.off("transaction", refresh));

function go(e: TocEntry, ev: MouseEvent) {
  // a prevented click: the editor's link handling leaves it alone instead of opening "#Heading" in a new tab
  ev.preventDefault();
  scrollToHeading(props.editor.view, e.pos);
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-toc">
    <BlockFrame :label="t('toc.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <nav class="wy-toc" :class="{ 'has-bg': color?.endsWith('_bg') }" :style="style" :aria-label="t('toc.label')" contenteditable="false">
        <p v-if="!entries.length" class="wy-toc-empty">{{ t("toc.empty") }}</p>
        <a v-for="e in entries" :key="e.pos" class="wy-toc-item" :href="`#${e.text}`" :style="{ '--wy-toc-depth': e.level - top }" @mousedown.prevent @click="go(e, $event)">{{ e.text }}</a>
      </nav>
      <template #menu>
        <BlockMenu :open="menu" @close="menu = false">
          <PalettePicker :value="color" :t="t" @pick="update({ color: $event })" />
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
