<script setup lang="ts">
// only a keyboard open moves focus into the panel; a mouse click keeps it in the editor, whose selection the menu uses
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import AnchoredPopover from "./AnchoredPopover.vue";

withDefaults(defineProps<{ panelClass?: string; side?: "bottom" | "top" | "right" }>(), { panelClass: "", side: "bottom" });
const emit = defineEmits<{ open: [] }>();
const open = ref(false);
const host = ref<HTMLElement | null>(null);
const popover = ref<InstanceType<typeof AnchoredPopover> | null>(null);

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function items(): HTMLElement[] {
  return [...(popover.value?.el?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
}

function close(refocus = true) {
  if (!open.value) return;
  open.value = false;
  if (refocus) host.value?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
}

async function toggle() {
  open.value = !open.value;
  if (!open.value) return;
  emit("open");
  const fromKeyboard = !!host.value?.contains(document.activeElement);
  await nextTick();
  if (fromKeyboard) items()[0]?.focus({ preventScroll: true });
}

function onPanelKey(e: KeyboardEvent) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const list = items();
  if (!list.length || (e.target as Element).tagName === "INPUT") return;
  e.preventDefault();
  const i = list.indexOf(document.activeElement as HTMLElement);
  list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]!.focus({ preventScroll: true });
}

function onDown(e: MouseEvent) {
  const t = e.target as Node;
  if (host.value?.contains(t) || popover.value?.el?.contains(t)) return;
  close(false);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && host.value?.contains(e.target as Node)) close();
}

function listen(on: boolean) {
  if (on) {
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
  } else {
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("keydown", onKey);
  }
}

watch(open, listen);
onBeforeUnmount(() => listen(false));

defineExpose({ close });
</script>

<template>
  <span ref="host" class="wy-dropdown">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <AnchoredPopover v-if="open" ref="popover" :anchor="host" :side="side" class="wy-menu wy-dropdown-panel is-open" :class="panelClass" @escape="close()" @keydown="onPanelKey">
      <slot :close="() => close()" />
    </AnchoredPopover>
  </span>
</template>
