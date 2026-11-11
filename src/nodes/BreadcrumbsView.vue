<script setup lang="ts">
import { onMounted, ref } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { ChevronRight, FileText } from "@lucide/vue";
import { contextOf } from "../editor/context";
import { followLink } from "../editor/navigate";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import type { Breadcrumb } from "../types";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, remove, copyText, readonly } = useBlockNode(props);
const crumbs = ref<Breadcrumb[] | null>(null);
const isImage = (icon: string) => /^(https?:|\/|data:image\/|blob:)/.test(icon);

onMounted(async () => {
  try {
    crumbs.value = (await ctx.services.breadcrumbs?.()) ?? [];
  } catch {
    crumbs.value = [];
  }
});

function open(c: Breadcrumb, e: MouseEvent) {
  followLink(ctx.services, c.href, e, c.href.startsWith("/"));
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-breadcrumbs">
    <BlockFrame :label="t('breadcrumbs.label')" :selected="selected" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove">
      <nav class="wy-breadcrumbs" :aria-label="t('breadcrumbs.label')" contenteditable="false">
        <template v-for="(c, i) in crumbs ?? []" :key="i">
          <ChevronRight v-if="i > 0" class="wy-breadcrumbs-sep" :size="14" aria-hidden="true" />
          <a class="wy-breadcrumb" :href="c.href" draggable="false" @click="open(c, $event)"
            ><span class="wy-breadcrumb-icon" aria-hidden="true"><img v-if="c.icon && isImage(c.icon)" :src="c.icon" alt="" /><template v-else-if="c.icon">{{ c.icon }}</template><FileText v-else :size="14" /></span
            ><span class="wy-breadcrumb-title">{{ c.title || t("pageLink.untitled") }}</span></a
          >
        </template>
        <span v-if="crumbs && !crumbs.length && !readonly" class="wy-breadcrumbs-empty">{{ t("breadcrumbs.empty") }}</span>
      </nav>
    </BlockFrame>
  </NodeViewWrapper>
</template>
