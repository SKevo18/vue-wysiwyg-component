<script setup lang="ts">
// the host's title and icon win over the stored fallbacks, which only change when the block is edited
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref, watch } from "vue";
import { FileText } from "@lucide/vue";
import { paletteCss } from "../core/palette";
import { contextOf } from "../editor/context";
import { followLink, resolveOnce } from "../editor/navigate";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import PalettePicker from "../components/PalettePicker.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, update, remove, copyText, readonly } = useBlockNode(props);
const menu = ref(false);
const resolved = ref<{ title: string; icon?: string } | null>(null);
const href = computed<string>(() => props.node.attrs.href ?? "");
const title = computed(() => resolved.value?.title || props.node.attrs.title || href.value || t("pageLink.untitled"));
const icon = computed(() => resolved.value?.icon || props.node.attrs.icon || "");
const isImage = computed(() => /^(https?:|\/|data:image\/|blob:)/.test(icon.value));
const color = computed<string | null>(() => props.node.attrs.color ?? null);
const style = computed(() => {
  const c = color.value;
  if (!c) return undefined;
  return c.endsWith("_bg") ? { background: paletteCss(c) } : { color: paletteCss(c) };
});

watch(
  href,
  async (h) => {
    resolved.value = null;
    const r = await resolveOnce(ctx.services, h);
    if (h === href.value) resolved.value = r;
  },
  { immediate: true },
);

function open(e: MouseEvent) {
  followLink(ctx.services, href.value, e, true);
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-page-link">
    <BlockFrame :label="t('pageLink.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <a class="wy-page-link" :class="{ 'has-bg': color?.endsWith('_bg') }" :href="href" :style="style" contenteditable="false" draggable="false" @click="open">
        <span class="wy-page-link-icon" aria-hidden="true">
          <img v-if="icon && isImage" :src="icon" alt="" />
          <template v-else-if="icon">{{ icon }}</template>
          <FileText v-else :size="18" />
        </span>
        <span class="wy-page-link-title">{{ title }}</span>
      </a>
      <template #menu>
        <BlockMenu :open="menu" @close="menu = false">
          <PalettePicker :value="color" :t="t" @pick="update({ color: $event })" />
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
