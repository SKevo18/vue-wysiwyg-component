<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { findParentNode, type Editor } from "@tiptap/core";
import { TableMap, selectedRect } from "@tiptap/pm/tables";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Ellipsis,
  GripHorizontal,
  GripVertical,
  Heading,
  Plus,
  Trash2,
} from "@lucide/vue";
import { useEditorContext } from "../editor/context";
import { hasHeaderColumn, hasHeaderRow, moveLine, runTableAction, selectLine, type ColumnAlign, type TableAction, type TableRef } from "../editor/tables";
import AnchoredPopover from "./AnchoredPopover.vue";
import { vTooltip } from "./tooltip";

const props = defineProps<{ editor: Editor; tick: number }>();
const ctx = useEditorContext();
const t = ctx.t;

const HIDE_DELAY = 250;
const DRAG_THRESHOLD = 4;
const ALIGNS: { value: ColumnAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "table.alignLeft" },
  { value: "center", icon: AlignCenter, label: "table.alignCenter" },
  { value: "right", icon: AlignRight, label: "table.alignRight" },
];

interface Line {
  index: number;
  start: number;
  end: number;
  visible: boolean;
}

interface Cell {
  row: number;
  col: number;
}

interface Geometry {
  table: TableRef;
  dom: HTMLElement;
  cols: Line[];
  rows: Line[];
  currentCols: Set<number>;
  currentRows: Set<number>;
  caret: Cell | null;
  header: boolean;
  headerColumn: boolean;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Drag {
  kind: "col" | "row";
  from: number;
  /** zero is before the first line, n after the last */
  gap: number;
  table: TableRef;
}

interface OpenMenu {
  kind: "col" | "row" | "table";
  index: number;
  dom: HTMLElement;
  anchor: HTMLElement;
}

const root = ref<HTMLElement | null>(null);
const hovered = ref<HTMLElement | null>(null);
const hoverCell = shallowRef<(Cell & { dom: HTMLElement }) | null>(null);
const geo = shallowRef<Geometry | null>(null);
const menu = shallowRef<OpenMenu | null>(null);
const drag = shallowRef<Drag | null>(null);
let press: { kind: "col" | "row"; index: number; x: number; y: number; id: number } | null = null;
let suppressClick = false;
let hideTimer = 0;
let frame = 0;

function tableAt(dom: HTMLElement): TableRef | null {
  const view = props.editor.view;
  let found: TableRef | null = null;
  view.state.doc.descendants((node, pos) => {
    if (found || node.isTextblock) return false;
    if (node.type.name !== "table") return true;
    if (view.nodeDOM(pos) === dom) found = { pos, node };
    return false;
  });
  return found;
}

function selectionTableDom(): HTMLElement | null {
  const found = findParentNode((n) => n.type.name === "table")(props.editor.state.selection);
  const dom = found ? props.editor.view.nodeDOM(found.pos) : null;
  return dom instanceof HTMLElement ? dom : null;
}

function measure() {
  frame = 0;
  const e = props.editor;
  const base = root.value?.getBoundingClientRect();
  const dom = drag.value ? (hovered.value ?? selectionTableDom()) : (menu.value?.dom ?? hovered.value ?? selectionTableDom());
  const table = base && e.isEditable && !e.isDestroyed && dom?.isConnected ? tableAt(dom) : null;
  const tableEl = dom?.querySelector("table");
  if (!base || !dom || !table || !tableEl) {
    geo.value = null;
    return;
  }
  const clip = dom.getBoundingClientRect();
  const box = tableEl.getBoundingClientRect();
  const left = Math.max(box.left, clip.left);
  const right = Math.min(box.right, clip.right);
  const map = TableMap.get(table.node);
  const inThis = findParentNode((n) => n.type.name === "table")(e.state.selection)?.pos === table.pos;
  const sel = inThis ? selectedRect(e.state) : null;
  const currentCols = new Set<number>();
  const currentRows = new Set<number>();
  if (sel) {
    if (map.width === 1 || sel.right - sel.left < map.width) for (let c = sel.left; c < sel.right; c++) currentCols.add(c);
    if (map.height === 1 || sel.bottom - sel.top < map.height) for (let r = sel.top; r < sel.bottom; r++) currentRows.add(r);
  }
  const cellRect = (row: number, col: number) => (e.view.nodeDOM(table.pos + 1 + map.map[row * map.width + col]!) as HTMLElement).getBoundingClientRect();
  const cols: Line[] = [];
  for (let c = 0; c < map.width; c++) {
    const r = cellRect(0, c);
    cols.push({ index: c, start: r.left - base.left, end: r.right - base.left, visible: r.right > left && r.left < right });
  }
  const rows: Line[] = [];
  for (let r = 0; r < map.height; r++) {
    const rr = cellRect(r, 0);
    rows.push({ index: r, start: rr.top - base.top, end: rr.bottom - base.top, visible: true });
  }
  geo.value = {
    table,
    dom,
    cols,
    rows,
    currentCols,
    currentRows,
    caret: sel ? { row: sel.top, col: sel.left } : null,
    header: hasHeaderRow(table.node),
    headerColumn: hasHeaderColumn(table.node),
    left: left - base.left,
    right: right - base.left,
    top: box.top - base.top,
    bottom: box.bottom - base.top,
  };
}

function cellOf(el: Element): Cell | null {
  try {
    const $pos = props.editor.view.state.doc.resolve(props.editor.view.posAtDOM(el, 0));
    for (let d = $pos.depth; d > 1; d--) {
      const role = $pos.node(d).type.spec.tableRole;
      if (role !== "cell" && role !== "header_cell") continue;
      const rect = TableMap.get($pos.node(d - 2)).findCell($pos.before(d) - $pos.start(d - 2));
      return { row: rect.top, col: rect.left };
    }
  } catch {
  }
  return null;
}

const active = computed<{ col: number | null; row: number | null }>(() => {
  const g = geo.value;
  if (!g) return { col: null, row: null };
  const d = drag.value;
  if (d) return { col: d.kind === "col" ? d.from : null, row: d.kind === "row" ? d.from : null };
  const m = menu.value;
  if (m && m.kind !== "table") return { col: m.kind === "col" ? m.index : null, row: m.kind === "row" ? m.index : null };
  const h = hoverCell.value?.dom === g.dom ? hoverCell.value : null;
  const cell = h ?? g.caret;
  return cell ? { col: cell.col, row: cell.row } : { col: null, row: null };
});

const colHandle = computed(() => {
  const g = geo.value;
  const line = g && active.value.col !== null ? g.cols[active.value.col] : undefined;
  if (!g || !line?.visible) return null;
  const x = Math.min(Math.max((line.start + line.end) / 2, g.left + 12), g.right - 12);
  return { index: line.index, x, y: g.top, current: g.currentCols.has(line.index) };
});

const rowHandle = computed(() => {
  const g = geo.value;
  const line = g && active.value.row !== null ? g.rows[active.value.row] : undefined;
  if (!g || !line) return null;
  return { index: line.index, x: g.left, y: (line.start + line.end) / 2, current: g.currentRows.has(line.index), fixed: line.index === 0 && g.header };
});

const dropLine = computed(() => {
  const g = geo.value;
  const d = drag.value;
  if (!g || !d) return null;
  const lines = d.kind === "col" ? g.cols : g.rows;
  const at = d.gap < lines.length ? lines[d.gap]!.start : lines[lines.length - 1]!.end;
  return d.kind === "col"
    ? { left: `${at}px`, top: `${g.top}px`, height: `${g.bottom - g.top}px` }
    : { left: `${g.left}px`, top: `${at}px`, width: `${g.right - g.left}px` };
});

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function cancelHide() {
  window.clearTimeout(hideTimer);
  hideTimer = 0;
}

function scheduleHide() {
  if (!hovered.value || hideTimer) return;
  hideTimer = window.setTimeout(() => {
    hideTimer = 0;
    hovered.value = null;
    hoverCell.value = null;
  }, HIDE_DELAY);
}

function onMove(e: MouseEvent) {
  const target = e.target as Element | null;
  if (!target || root.value?.contains(target)) {
    cancelHide();
    return;
  }
  const wrapper = target.closest?.(".tableWrapper");
  if (wrapper instanceof HTMLElement && props.editor.view.dom.contains(wrapper)) {
    cancelHide();
    if (hovered.value !== wrapper) hovered.value = wrapper;
    const el = target.closest("td, th");
    const cell = el && wrapper.contains(el) ? cellOf(el) : null;
    const prev = hoverCell.value;
    if (cell && (prev?.dom !== wrapper || prev.row !== cell.row || prev.col !== cell.col)) hoverCell.value = { ...cell, dom: wrapper };
    return;
  }
  scheduleHide();
}

function onLeave() {
  if (!drag.value) scheduleHide();
}

function open(kind: OpenMenu["kind"], index: number, ev: MouseEvent) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const g = geo.value;
  if (!g) return;
  if (kind !== "table") selectLine(props.editor, g.table, kind, index);
  props.editor.view.focus();
  menu.value = { kind, index, dom: g.dom, anchor: ev.currentTarget as HTMLElement };
}

function onGripDown(kind: "col" | "row", index: number, e: PointerEvent) {
  const g = geo.value;
  suppressClick = false;
  if (e.button !== 0 || !g || (kind === "row" && index === 0 && g.header)) return;
  press = { kind, index, x: e.clientX, y: e.clientY, id: e.pointerId };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onGripMove(e: PointerEvent) {
  if (!press || e.pointerId !== press.id) return;
  const g = geo.value;
  if (!g) return;
  if (!drag.value) {
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return;
    close();
    selectLine(props.editor, g.table, press.kind, press.index);
    drag.value = { kind: press.kind, from: press.index, gap: press.index, table: g.table };
    document.documentElement.classList.add("wy-dragging-table");
    window.addEventListener("keydown", onDragKey, true);
  }
  const d = drag.value!;
  const base = root.value!.getBoundingClientRect();
  const v = d.kind === "col" ? e.clientX - base.left : e.clientY - base.top;
  let gap = 0;
  for (const l of d.kind === "col" ? g.cols : g.rows) if (v > (l.start + l.end) / 2) gap = l.index + 1;
  if (d.kind === "row" && g.header) gap = Math.max(gap, 1);
  if (gap !== d.gap) drag.value = { ...d, gap };
}

function endDrag(apply: boolean) {
  const d = drag.value;
  press = null;
  if (!d) return;
  drag.value = null;
  document.documentElement.classList.remove("wy-dragging-table");
  window.removeEventListener("keydown", onDragKey, true);
  // the click that follows a drag lands on the grip; it must not open the menu
  suppressClick = true;
  const to = d.gap > d.from ? d.gap - 1 : d.gap;
  if (apply && to !== d.from) moveLine(props.editor, d.table, d.kind, d.from, to);
  props.editor.view.focus();
}

function onGripUp(e: PointerEvent) {
  if (press && e.pointerId === press.id) endDrag(true);
}

function onDragKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  e.stopPropagation();
  endDrag(false);
}

function close() {
  menu.value = null;
}

function run(action: TableAction) {
  const g = geo.value;
  close();
  if (g) runTableAction(props.editor, g.table, action);
}

function append(action: "addCol" | "addRow") {
  const g = geo.value;
  if (g) runTableAction(props.editor, g.table, { kind: "table", action });
}

const columnAlign = computed(() => {
  const m = menu.value;
  const cell = m?.kind === "col" ? geo.value?.table.node.firstChild?.maybeChild(m.index) : null;
  return (cell?.attrs.align as ColumnAlign | null) ?? null;
});

function onDocDown(e: MouseEvent) {
  const target = e.target as Element;
  if (target.closest?.(".wy-table-menu") || root.value?.contains(target)) return;
  close();
}

watch(menu, (m, prev) => {
  if (m && !prev) document.addEventListener("mousedown", onDocDown, true);
  else if (!m) document.removeEventListener("mousedown", onDocDown, true);
});
watch(() => [props.tick, hovered.value, menu.value, drag.value === null], schedule);
watch(geo, async () => {
  const m = menu.value;
  if (!m) return;
  if (!geo.value) {
    close();
    return;
  }
  await nextTick();
  const el = root.value?.querySelector<HTMLElement>(`[data-handle="${m.kind}-${m.index}"]`);
  if (el && el !== m.anchor) menu.value = { ...m, anchor: el };
});

const resize = new ResizeObserver(schedule);
let zone: HTMLElement | null = null;

onMounted(() => {
  zone = root.value?.parentElement ?? null;
  zone?.addEventListener("mousemove", onMove);
  zone?.addEventListener("mouseleave", onLeave);
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  resize.observe(props.editor.view.dom);
});

onBeforeUnmount(() => {
  cancelHide();
  cancelAnimationFrame(frame);
  zone?.removeEventListener("mousemove", onMove);
  zone?.removeEventListener("mouseleave", onLeave);
  window.removeEventListener("scroll", schedule, { capture: true });
  window.removeEventListener("resize", schedule);
  document.removeEventListener("mousedown", onDocDown, true);
  window.removeEventListener("keydown", onDragKey, true);
  document.documentElement.classList.remove("wy-dragging-table");
  resize.disconnect();
});
</script>

<template>
  <div ref="root" class="wy-table-controls" contenteditable="false">
    <template v-if="geo">
      <button
        v-tooltip="t('table.menu')"
        type="button"
        class="wy-table-corner"
        data-handle="table-0"
        :style="{ left: `${geo.left}px`, top: `${geo.top}px` }"
        :aria-label="t('table.menu')"
        aria-haspopup="menu"
        :aria-expanded="menu?.kind === 'table'"
        @mousedown.prevent
        @click="open('table', 0, $event)"
      >
        <Ellipsis :size="14" />
      </button>
      <button
        v-if="colHandle"
        :key="`c${colHandle.index}`"
        v-tooltip="`${t('table.column', { n: colHandle.index + 1 })}. ${t('table.dragHint')}`"
        type="button"
        class="wy-table-handle is-col"
        :class="{ 'is-current': colHandle.current, 'is-dragging': drag?.kind === 'col' }"
        :data-handle="`col-${colHandle.index}`"
        :style="{ left: `${colHandle.x}px`, top: `${colHandle.y}px` }"
        :aria-label="t('table.column', { n: colHandle.index + 1 })"
        aria-haspopup="menu"
        :aria-expanded="menu?.kind === 'col' && menu.index === colHandle.index"
        @mousedown.prevent
        @pointerdown="onGripDown('col', colHandle.index, $event)"
        @pointermove="onGripMove"
        @pointerup="onGripUp"
        @pointercancel="endDrag(false)"
        @click="open('col', colHandle.index, $event)"
      >
        <GripHorizontal :size="14" />
      </button>
      <button
        v-if="rowHandle"
        :key="`r${rowHandle.index}`"
        v-tooltip="rowHandle.fixed ? t('table.row', { n: 1 }) : `${t('table.row', { n: rowHandle.index + 1 })}. ${t('table.dragHint')}`"
        type="button"
        class="wy-table-handle is-row"
        :class="{ 'is-current': rowHandle.current, 'is-dragging': drag?.kind === 'row', 'is-fixed': rowHandle.fixed }"
        :data-handle="`row-${rowHandle.index}`"
        :style="{ left: `${rowHandle.x}px`, top: `${rowHandle.y}px` }"
        :aria-label="t('table.row', { n: rowHandle.index + 1 })"
        aria-haspopup="menu"
        :aria-expanded="menu?.kind === 'row' && menu.index === rowHandle.index"
        @mousedown.prevent
        @pointerdown="onGripDown('row', rowHandle.index, $event)"
        @pointermove="onGripMove"
        @pointerup="onGripUp"
        @pointercancel="endDrag(false)"
        @click="open('row', rowHandle.index, $event)"
      >
        <GripVertical :size="14" />
      </button>
      <div v-if="dropLine" class="wy-table-drop" :class="drag?.kind === 'col' ? 'is-col' : 'is-row'" :style="dropLine" aria-hidden="true" />
      <button
        v-show="!drag"
        v-tooltip="t('table.addColumn')"
        type="button"
        class="wy-table-add is-col"
        :style="{ left: `${geo.right}px`, top: `${geo.top}px`, height: `${geo.bottom - geo.top}px` }"
        :aria-label="t('table.addColumn')"
        @mousedown.prevent
        @click="append('addCol')"
      >
        <Plus :size="14" />
      </button>
      <button
        v-show="!drag"
        v-tooltip="t('table.addRow')"
        type="button"
        class="wy-table-add is-row"
        :style="{ left: `${geo.left}px`, top: `${geo.bottom}px`, width: `${geo.right - geo.left}px` }"
        :aria-label="t('table.addRow')"
        @mousedown.prevent
        @click="append('addRow')"
      >
        <Plus :size="14" />
      </button>
    </template>

    <AnchoredPopover v-if="menu" :key="`${menu.kind}-${menu.index}`" :anchor="menu.anchor" :side="menu.kind === 'row' ? 'right' : 'bottom'" class="wy-menu wy-table-menu" role="menu" @escape="close">
      <template v-if="menu.kind === 'col'">
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @click="run({ kind: 'col', index: menu.index, action: 'before' })"><BetweenVerticalStart class="wy-menu-icon" :size="16" />{{ t("table.insertLeft") }}</button>
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @click="run({ kind: 'col', index: menu.index, action: 'after' })"><BetweenVerticalEnd class="wy-menu-icon" :size="16" />{{ t("table.insertRight") }}</button>
        <button v-if="menu.index === 0" type="button" class="wy-menu-item" role="menuitemcheckbox" :aria-checked="geo?.headerColumn" :aria-pressed="geo?.headerColumn" @mousedown.prevent @click="run({ kind: 'col', index: 0, action: 'header' })"><Heading class="wy-menu-icon" :size="16" />{{ t("table.headerColumn") }}</button>
        <div class="wy-menu-split">
          <span class="wy-menu-hint">{{ t("table.align") }}</span>
          <div class="wy-seg" role="group" :aria-label="t('table.align')">
            <button v-for="a in ALIGNS" :key="a.value" v-tooltip="t(a.label)" type="button" :aria-pressed="(columnAlign ?? 'left') === a.value" :aria-label="t(a.label)" @mousedown.prevent @click="run({ kind: 'col', index: menu.index, action: a.value })">
              <component :is="a.icon" :size="14" />
            </button>
          </div>
        </div>
        <button type="button" class="wy-menu-item is-danger" role="menuitem" @mousedown.prevent @click="run({ kind: 'col', index: menu.index, action: 'delete' })"><Trash2 class="wy-menu-icon" :size="16" />{{ t("table.deleteColumn") }}</button>
      </template>
      <template v-else-if="menu.kind === 'row'">
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @click="run({ kind: 'row', index: menu.index, action: 'before' })"><BetweenHorizontalStart class="wy-menu-icon" :size="16" />{{ t("table.insertAbove") }}</button>
        <button type="button" class="wy-menu-item" role="menuitem" @mousedown.prevent @click="run({ kind: 'row', index: menu.index, action: 'after' })"><BetweenHorizontalEnd class="wy-menu-icon" :size="16" />{{ t("table.insertBelow") }}</button>
        <button v-if="menu.index === 0" type="button" class="wy-menu-item" role="menuitemcheckbox" :aria-checked="geo?.header" :aria-pressed="geo?.header" @mousedown.prevent @click="run({ kind: 'row', index: 0, action: 'header' })"><Heading class="wy-menu-icon" :size="16" />{{ t("table.headerRow") }}</button>
        <button type="button" class="wy-menu-item is-danger" role="menuitem" @mousedown.prevent @click="run({ kind: 'row', index: menu.index, action: 'delete' })"><Trash2 class="wy-menu-icon" :size="16" />{{ t("table.deleteRow") }}</button>
      </template>
      <template v-else>
        <button type="button" class="wy-menu-item" role="menuitemcheckbox" :aria-checked="geo?.header" :aria-pressed="geo?.header" @mousedown.prevent @click="run({ kind: 'row', index: 0, action: 'header' })"><Heading class="wy-menu-icon" :size="16" />{{ t("table.headerRow") }}</button>
        <button type="button" class="wy-menu-item" role="menuitemcheckbox" :aria-checked="geo?.headerColumn" :aria-pressed="geo?.headerColumn" @mousedown.prevent @click="run({ kind: 'col', index: 0, action: 'header' })"><Heading class="wy-menu-icon" :size="16" />{{ t("table.headerColumn") }}</button>
        <button type="button" class="wy-menu-item is-danger" role="menuitem" @mousedown.prevent @click="run({ kind: 'table', action: 'delete' })"><Trash2 class="wy-menu-icon" :size="16" />{{ t("table.deleteTable") }}</button>
      </template>
    </AnchoredPopover>
  </div>
</template>
