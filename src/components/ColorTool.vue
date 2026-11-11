<script setup lang="ts">
// text and background colour of the selection: the fixed toolbar and the compact field tools
import { computed } from "vue";
import type { Editor } from "@tiptap/core";
import { Baseline } from "@lucide/vue";
import { tokenCss } from "../core/colors";
import { useEditorContext } from "../editor/context";
import ColorMenu from "./ColorMenu.vue";
import Dropdown from "./Dropdown.vue";
import { vTooltip } from "./tooltip";

const props = withDefaults(defineProps<{ editor: Editor; tick: number; small?: boolean }>(), { small: false });
const ctx = useEditorContext();
const t = ctx.t;
const html = ctx.config.format === "html";

const state = computed(() => {
  void props.tick;
  return { color: String(props.editor.getAttributes("textStyle").color ?? ""), mark: String(props.editor.getAttributes("highlight").color ?? "") };
});
</script>

<template>
  <Dropdown panel-class="wy-color-panel">
    <template #trigger="{ open, toggle }">
      <button v-tooltip="t('toolbar.color')" type="button" class="wy-tool" :class="{ 'is-sm': small }" :aria-label="t('toolbar.color')" aria-haspopup="menu" :aria-expanded="open" @mousedown.prevent @click="toggle">
        <Baseline :size="small ? 15 : 18" :style="{ color: (html ? state.color : tokenCss(state.color)) || undefined }" />
      </button>
    </template>
    <template #default="{ close }">
      <ColorMenu :editor="editor" :color="state.color" :highlight="state.mark" @done="close" />
    </template>
  </Dropdown>
</template>
