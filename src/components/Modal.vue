<script lang="ts">
// open dialogs, innermost last: only the innermost one reacts to Esc and keeps Tab inside
const openDialogs: symbol[] = [];
const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [contenteditable='true'], [tabindex]:not([tabindex='-1'])";
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { X } from "@lucide/vue";
import { vTooltip } from "./tooltip";

const props = withDefaults(defineProps<{ open: boolean; title?: string; size?: "sm" | "lg"; closeLabel?: string }>(), { title: "", size: "sm", closeLabel: "Close" });
const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement | null>(null);
let previous: HTMLElement | null = null;
let overflow = "";

const stack = openDialogs;
const self = Symbol("modal");

function trapTab(e: KeyboardEvent) {
  const el = panel.value;
  if (!el || e.defaultPrevented || !(el === document.activeElement || el.contains(document.activeElement))) return;
  const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (!first || !last) {
    e.preventDefault();
    el.focus();
  } else if (e.shiftKey && (active === first || active === el)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function onKey(e: KeyboardEvent) {
  if (stack[stack.length - 1] !== self) return;
  if (e.key === "Tab") return trapTab(e);
  if (e.key !== "Escape") return;
  const target = e.target as Element | null;
  // node views and menus that handle Esc prevent it; the editor text itself prevents it too, which still closes
  if (e.defaultPrevented && !target?.classList?.contains("wy-content")) return;
  if (panel.value?.querySelector('[aria-expanded="true"]') && !target?.closest(".wy-modal-head")) return;
  e.preventDefault();
  emit("close");
}

function release() {
  const i = stack.indexOf(self);
  if (i < 0) return;
  stack.splice(i, 1);
  document.body.style.overflow = overflow;
  document.removeEventListener("keydown", onKey);
}

watch(
  () => props.open,
  async (open, was) => {
    if (open) {
      previous = document.activeElement as HTMLElement | null;
      overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      stack.push(self);
      document.addEventListener("keydown", onKey);
      await nextTick();
      if (!panel.value?.contains(document.activeElement)) panel.value?.focus();
    } else if (was) {
      release();
      previous?.focus?.();
    }
  },
  { immediate: true },
);

onBeforeUnmount(release);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="wy-modal-backdrop" @mousedown.self="emit('close')">
      <div ref="panel" class="wy-modal" :class="`is-${size}`" role="dialog" aria-modal="true" :aria-label="title || undefined" tabindex="-1">
        <div class="wy-modal-head">
          <span class="wy-modal-title">{{ title }}</span>
          <slot name="head" />
          <button v-tooltip="closeLabel" type="button" class="wy-icon-btn" :aria-label="closeLabel" @click="emit('close')"><X :size="18" /></button>
        </div>
        <div class="wy-modal-body"><slot /></div>
      </div>
    </div>
  </Teleport>
</template>
