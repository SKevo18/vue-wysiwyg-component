<script setup lang="ts">
// a mousedown on the frame's own toggle buttons (`data-block-more`) is left to them
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { contextOf } from "../editor/context";
import { convertRun, nodeRun, runTargets } from "../editor/convert";
import ConvertItems from "../components/ConvertItems.vue";

const props = defineProps<{ open: boolean; convert?: { editor: Editor; node: PMNode; getPos: () => number | undefined } }>();
const emit = defineEmits<{ close: [] }>();
const root = ref<HTMLElement | null>(null);

function run() {
  const pos = props.convert?.getPos();
  return props.convert && pos !== undefined ? nodeRun(props.convert.editor.state, pos) : null;
}

const targets = computed(() => {
  const c = props.convert;
  if (!props.open || !c?.node || !c.editor.isEditable) return [];
  const r = run();
  return r ? runTargets(contextOf(c.editor).convert, c.editor.state, r) : [];
});

const title = computed(() => (props.convert ? contextOf(props.convert.editor).t("convert.title") : ""));

function pick(target: string) {
  const editor = props.convert?.editor;
  const r = run();
  const tr = editor && r && convertRun(contextOf(editor).convert, editor.state, r, target);
  emit("close");
  if (!editor || !tr) return;
  editor.view.dispatch(tr);
  editor.view.focus();
}

function onDocDown(e: MouseEvent) {
  const target = e.target as Element;
  if (!root.value || root.value.contains(target)) return;
  if (target.closest?.("[data-block-more]")?.closest(".wy-block-frame") === root.value.parentElement) return;
  emit("close");
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  e.stopPropagation();
  emit("close");
}

function listen(on: boolean) {
  const fn = on ? document.addEventListener.bind(document) : document.removeEventListener.bind(document);
  fn("mousedown", onDocDown as EventListener, true);
  fn("keydown", onKey as EventListener, true);
}

watch(() => props.open, listen, { immediate: true });
onBeforeUnmount(() => listen(false));
</script>

<template>
  <div v-if="open" ref="root" class="wy-menu wy-block-menu" role="menu" contenteditable="false" data-block-portal @mousedown.stop>
    <slot />
    <template v-if="targets.length">
      <div class="wy-menu-heading">{{ title }}</div>
      <ConvertItems :targets="targets" @pick="pick" />
    </template>
  </div>
</template>
