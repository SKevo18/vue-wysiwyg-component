<script setup lang="ts">
import { computed, type Component } from "vue";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { Bold, Code, Highlighter, Italic, Strikethrough, Underline } from "@lucide/vue";
import { useEditorContext } from "../editor/context";
import { vTooltip } from "./tooltip";

const props = withDefaults(defineProps<{ editor: Editor; tick: number; small?: boolean; highlight?: boolean }>(), { small: false, highlight: true });
const ctx = useEditorContext();
const b = ctx.config.base;
const html = ctx.config.format === "html";

interface MarkTool {
  id: string;
  icon: Component;
  keys: string;
  toggle(chain: ChainedCommands): ChainedCommands;
}

const tools: MarkTool[] = [
  { id: "bold", icon: Bold, keys: "Mod-b", toggle: (c) => c.toggleBold() },
  { id: "italic", icon: Italic, keys: "Mod-i", toggle: (c) => c.toggleItalic() },
  ...(b.underline ? [{ id: "underline", icon: Underline, keys: "Mod-u", toggle: (c: ChainedCommands) => c.toggleUnderline() }] : []),
  { id: "strike", icon: Strikethrough, keys: "Mod-Shift-s", toggle: (c) => c.toggleStrike() },
  { id: "code", icon: Code, keys: "Mod-e", toggle: (c) => c.toggleCode() },
  ...(b.highlight && !html && props.highlight ? [{ id: "highlight", icon: Highlighter, keys: "Mod-Shift-h", toggle: (c: ChainedCommands) => c.toggleHighlight() }] : []),
];

const active = computed(() => {
  void props.tick;
  return Object.fromEntries(tools.map((m) => [m.id, props.editor.isActive(m.id)]));
});
</script>

<template>
  <button
    v-for="m in tools"
    :key="m.id"
    v-tooltip="{ text: ctx.t(`toolbar.${m.id}`), keys: m.keys }"
    type="button"
    class="wy-tool"
    :class="{ 'is-sm': small }"
    :aria-label="ctx.t(`toolbar.${m.id}`)"
    :aria-pressed="active[m.id]"
    @mousedown.prevent
    @click="m.toggle(editor.chain().focus()).run()"
  >
    <component :is="m.icon" :size="small ? 15 : 18" />
  </button>
</template>
