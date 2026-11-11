<script setup lang="ts">
// the handle on a column's right edge (hidden on the last one by css) moves the border to the next column; widths are written once on release
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref } from "vue";
import type { Node as PMNode } from "@tiptap/pm/model";
import { MIN_COLUMN_WIDTH, columnShares, formatColumnWidth } from "../builtins/columns";
import { contextOf } from "../editor/context";
import { vTooltip } from "../components/tooltip";

const props = defineProps(nodeViewProps);
const t = contextOf(props.editor).t;
const readonly = computed(() => !props.editor.isEditable);
const width = computed(() => props.node.attrs.width as number | null);
const grow = computed(() => (width.value ? formatColumnWidth(width.value) : "calc(100 / var(--wy-columns, 2))"));
const resizing = ref(false);

interface Drag {
  columnsPos: number;
  index: number;
  shares: number[];
  px: number;
  startX: number;
  doms: [HTMLElement, HTMLElement];
  next: [number, number];
}
let drag: Drag | null = null;

function parent(): { pos: number; node: PMNode; index: number } | null {
  const pos = props.getPos();
  if (typeof pos !== "number") return null;
  const $pos = props.editor.state.doc.resolve(pos);
  return $pos.parent.type.name === "columns" ? { pos: $pos.before(), node: $pos.parent, index: $pos.index() } : null;
}

function onDown(e: PointerEvent) {
  const p = parent();
  if (!p || e.button !== 0 || p.index >= p.node.childCount - 1) return;
  const row = (e.currentTarget as HTMLElement).closest(".wy-columns");
  const first = props.editor.view.nodeDOM(p.pos + 1 + offsetOf(p.node, p.index));
  const second = props.editor.view.nodeDOM(p.pos + 1 + offsetOf(p.node, p.index + 1));
  if (!(row instanceof HTMLElement) || !(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  const shares = columnShares(p.node);
  drag = { columnsPos: p.pos, index: p.index, shares, px: row.clientWidth, startX: e.clientX, doms: [first, second], next: [shares[p.index]!, shares[p.index + 1]!] };
  resizing.value = true;
}

function offsetOf(node: PMNode, index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i++) offset += node.child(i).nodeSize;
  return offset;
}

function onMove(e: PointerEvent) {
  if (!drag) return;
  const total = drag.shares.reduce((s, w) => s + w, 0);
  const pair = drag.shares[drag.index]! + drag.shares[drag.index + 1]!;
  const delta = ((e.clientX - drag.startX) / Math.max(1, drag.px)) * total;
  const a = Math.min(pair - MIN_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, drag.shares[drag.index]! + delta));
  drag.next = [a, pair - a];
  drag.doms[0].style.flexGrow = String(a);
  drag.doms[1].style.flexGrow = String(pair - a);
}

function onUp() {
  const d = drag;
  drag = null;
  resizing.value = false;
  if (!d) return;
  d.doms.forEach((el) => el.style.removeProperty("flex-grow"));
  const node = props.editor.state.doc.nodeAt(d.columnsPos);
  if (!node || node.type.name !== "columns") return;
  // every column gets a concrete width in percent of the row, to a tenth
  const shares = [...d.shares];
  shares[d.index] = d.next[0];
  shares[d.index + 1] = d.next[1];
  const total = shares.reduce((s, w) => s + w, 0);
  const tr = props.editor.state.tr;
  node.forEach((c, offset, i) => tr.setNodeMarkup(d.columnsPos + 1 + offset, null, { ...c.attrs, width: Math.round(((shares[i]! * 100) / total) * 10) / 10 }));
  props.editor.view.dispatch(tr);
}

onBeforeUnmount(() => {
  drag = null;
});
</script>

<template>
  <NodeViewWrapper as="div" class="wy-column" :class="{ 'is-resizing': resizing }" :style="{ flexGrow: grow }">
    <NodeViewContent class="wy-column-body" />
    <div
      v-if="!readonly"
      v-tooltip="t('columns.resize')"
      class="wy-column-resize"
      contenteditable="false"
      role="separator"
      aria-orientation="vertical"
      :aria-label="t('columns.resize')"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    ></div>
  </NodeViewWrapper>
</template>
