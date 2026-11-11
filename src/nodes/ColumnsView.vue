<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref } from "vue";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { Columns2, Minus, Plus } from "@lucide/vue";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const { selected, remove, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const count = computed(() => props.node.childCount);
const sized = computed(() => {
  let any = false;
  props.node.forEach((c) => (any ||= c.attrs.width !== null));
  return any;
});

function at(): number | null {
  const pos = props.getPos();
  return typeof pos === "number" ? pos : null;
}

/** the column holding the caret, else the last one */
function currentColumn(pos: number): number {
  const $head = props.editor.state.selection.$head;
  for (let d = $head.depth; d > 0; d--) if ($head.before(d) === pos) return $head.index(d);
  return count.value - 1;
}

function addColumn() {
  const pos = at();
  if (pos === null) return;
  const { schema, tr } = props.editor.state;
  const end = pos + props.node.nodeSize - 1;
  // every column gives up the same fraction of its width to the new one
  const n = count.value;
  props.node.forEach((c, offset) => {
    if (c.attrs.width) tr.setNodeMarkup(pos + 1 + offset, null, { ...c.attrs, width: Math.round(((c.attrs.width as number) * n * 100) / (n + 1)) / 100 });
  });
  tr.insert(end, schema.nodes.column!.create(null, schema.nodes.paragraph!.create()));
  tr.setSelection(TextSelection.near(tr.doc.resolve(end + 2)));
  props.editor.view.dispatch(tr.scrollIntoView());
  props.editor.view.focus();
  menu.value = false;
}

/** the column's blocks move to its neighbour; the last remaining column unwraps */
function removeColumn() {
  const pos = at();
  if (pos === null) return;
  const index = currentColumn(pos);
  const columns: { node: PMNode; from: number }[] = [];
  props.node.forEach((c, offset) => columns.push({ node: c, from: pos + 1 + offset }));
  const gone = columns[index]!;
  const keep = columns[index === 0 ? 1 : index - 1];
  const { tr, schema } = props.editor.state;
  if (!keep) return;
  const moved: PMNode[] = [];
  gone.node.forEach((b) => {
    if (!(b.type.name === "paragraph" && b.childCount === 0)) moved.push(b);
  });
  const merged = keep.node.copy(index === 0 ? Fragment.from(moved).append(keep.node.content) : keep.node.content.append(Fragment.from(moved)));
  const rest = columns.filter((c) => c !== gone).map((c) => (c === keep ? merged : c.node));
  const replacement = rest.length === 1 ? rest[0]!.content : Fragment.from(schema.nodes.columns!.create(props.node.attrs, rest.map((c) => c.type.create({ ...c.attrs, width: null }, c.content))));
  tr.replaceWith(pos, pos + props.node.nodeSize, replacement);
  tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)));
  props.editor.view.dispatch(tr.scrollIntoView());
  props.editor.view.focus();
  menu.value = false;
}

function equalWidths() {
  const pos = at();
  if (pos === null) return;
  const tr = props.editor.state.tr;
  props.node.forEach((c, offset) => tr.setNodeMarkup(pos + 1 + offset, null, { ...c.attrs, width: null }));
  props.editor.view.dispatch(tr);
  menu.value = false;
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-columns">
    <BlockFrame :label="t('columns.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <NodeViewContent class="wy-columns" :style="{ '--wy-columns': count }" />
      <template #menu>
        <BlockMenu :open="menu" :convert="props" @close="menu = false">
          <button type="button" class="wy-menu-item" role="menuitem" @click="addColumn"><Plus class="wy-menu-icon" :size="16" />{{ t("columns.add") }}</button>
          <button type="button" class="wy-menu-item" role="menuitem" :title="t('columns.removeHint')" @click="removeColumn"><Minus class="wy-menu-icon" :size="16" />{{ t("columns.remove") }}</button>
          <button v-if="sized" type="button" class="wy-menu-item" role="menuitem" @click="equalWidths"><Columns2 class="wy-menu-icon" :size="16" />{{ t("columns.equal") }}</button>
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
