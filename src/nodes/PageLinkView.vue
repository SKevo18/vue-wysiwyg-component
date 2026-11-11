<script setup lang="ts">
// the host's title and icon win over the stored fallbacks, which only change when the link is inserted again
import { nodeViewProps } from "@tiptap/vue-3";
import { computed, ref, watch } from "vue";
import { FileText } from "@lucide/vue";
import { pageTarget } from "../builtins/pageLink";
import { contextOf } from "../editor/context";
import { followLink, resolveOnce } from "../editor/navigate";
import InlineChip from "../blocks/InlineChip.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const resolved = ref<{ title: string; icon?: string } | null>(null);
const href = computed(() => pageTarget(String(props.node.attrs.href ?? ""), ctx.config.base.pageHref));
const title = computed(() => resolved.value?.title || props.node.attrs.title || href.value || t("pageLink.untitled"));
const icon = computed(() => resolved.value?.icon || props.node.attrs.icon || "");
const isImage = computed(() => /^(https?:|\/|data:image\/|blob:)/.test(icon.value));

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
  followLink(ctx.services, href.value, e, href.value.startsWith("/"));
}
</script>

<template>
  <InlineChip :selected="selected" class="wy-page-link-atom">
    <a class="wy-page-link" :href="href || undefined" draggable="false" @click="open"
      ><span class="wy-page-link-icon" aria-hidden="true"><img v-if="icon && isImage" :src="icon" alt="" /><template v-else-if="icon">{{ icon }}</template><FileText v-else :size="15" /></span
      ><span class="wy-page-link-title">{{ title }}</span></a
    >
  </InlineChip>
</template>
