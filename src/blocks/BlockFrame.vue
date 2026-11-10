<script setup lang="ts">
import { inject } from "vue";
import { Copy, Ellipsis, Pencil, Trash2 } from "@lucide/vue";
import { EDITOR_CONTEXT } from "../editor/context";
import { vTooltip } from "../components/tooltip";

const props = withDefaults(
  defineProps<{
    label: string;
    selected?: boolean;
    editing?: boolean;
    readonly?: boolean;
    copyText?: string;
    editable?: boolean;
    deletable?: boolean;
  }>(),
  { selected: false, editing: false, readonly: false, editable: true, deletable: true, copyText: "" },
);
const emit = defineEmits<{ edit: []; delete: []; more: [event: MouseEvent] }>();
const ctx = inject(EDITOR_CONTEXT, null);
const t = (key: string, fallback: string) => ctx?.t(key) ?? fallback;

async function copy() {
  if (!props.copyText) return;
  try {
    await navigator.clipboard.writeText(props.copyText);
    ctx?.services.toast?.(t("editor.copied", "Copied"), "success");
  } catch {
  }
}
</script>

<template>
  <div class="wy-block-frame" :class="{ 'is-selected': selected, 'is-editing': editing, 'is-readonly': readonly, 'is-editable': editable && !readonly }">
    <div v-if="!readonly" class="wy-block-tools" contenteditable="false">
      <span class="wy-block-label">{{ label }}</span>
      <button v-if="editable && !editing" v-tooltip="t('block.edit', 'Edit')" type="button" class="wy-icon-btn" :aria-label="t('block.edit', 'Edit')" @mousedown.prevent @click="emit('edit')"><Pencil :size="14" /></button>
      <button v-if="copyText" v-tooltip="t('block.copy', 'Copy')" type="button" class="wy-icon-btn" :aria-label="t('block.copy', 'Copy')" @mousedown.prevent @click="copy"><Copy :size="14" /></button>
      <button v-if="deletable" v-tooltip="t('block.delete', 'Delete')" type="button" class="wy-icon-btn is-danger" :aria-label="t('block.delete', 'Delete')" @mousedown.prevent @click="emit('delete')"><Trash2 :size="14" /></button>
      <button v-if="$slots.menu" v-tooltip="t('block.more', 'More')" type="button" class="wy-icon-btn" data-block-more :aria-label="t('block.more', 'More')" @mousedown.prevent @click="emit('more', $event)"><Ellipsis :size="14" /></button>
    </div>
    <div class="wy-block-body"><slot /></div>
    <slot name="menu" />
  </div>
</template>
