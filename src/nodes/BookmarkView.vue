<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ExternalLink, Globe, Pencil, RefreshCw } from "@lucide/vue";
import { siteName, type BookmarkAttrs } from "../builtins/bookmark";
import { loneUrl } from "../core/embeds";
import { normalizeHref } from "../editor/behaviour";
import { contextOf } from "../editor/context";
import { followLink } from "../editor/navigate";
import BlockFrame from "../blocks/BlockFrame.vue";
import BlockMenu from "../blocks/BlockMenu.vue";
import { useBlockNode } from "../blocks/useBlockNode";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, stopEdit, update, remove, copyText, readonly } = useBlockNode(props, { editOnInsert: true });
const menu = ref(false);
const loading = ref(false);
const input = ref<HTMLInputElement | null>(null);
const draft = ref("");
const failedImage = ref(false);
const failedIcon = ref(false);
const a = computed(() => props.node.attrs as BookmarkAttrs);
const title = computed(() => a.value.title || a.value.site || siteName(a.value.url) || a.value.url);
let abort: AbortController | null = null;

watch(
  () => a.value.image,
  () => (failedImage.value = false),
);
watch(
  () => a.value.icon,
  () => (failedIcon.value = false),
);

watch(
  editing,
  async (on) => {
    if (!on) return;
    draft.value = a.value.url;
    await nextTick();
    input.value?.focus();
    input.value?.select();
  },
  { immediate: true },
);

async function refresh(url = a.value.url) {
  abort?.abort();
  menu.value = false;
  const fallback = { site: siteName(url) };
  const preview = ctx.services.linkPreview;
  if (!preview) {
    update(fallback);
    return;
  }
  const ctrl = (abort = new AbortController());
  loading.value = true;
  try {
    const p = await preview(url, ctrl.signal);
    if (ctrl.signal.aborted || props.node.attrs.url !== url) return;
    update({ title: p?.title ?? "", description: p?.description ?? "", image: p?.image ?? "", icon: p?.icon ?? "", site: p?.site || fallback.site });
  } catch {
    if (!ctrl.signal.aborted) ctx.services.toast?.(t("bookmark.failed"), "error");
  } finally {
    if (!ctrl.signal.aborted) loading.value = false;
  }
}

function submit() {
  const url = normalizeHref(draft.value);
  if (!url || !loneUrl(url)) return;
  const changed = url !== a.value.url;
  update({ url, ...(changed ? { title: "", description: "", image: "", icon: "", site: siteName(url) } : {}) });
  finishEdit();
  if (changed) void refresh(url);
}

function cancel() {
  if (!a.value.url) remove();
  else stopEdit();
}

function open(e: MouseEvent) {
  if (a.value.url) followLink(ctx.services, a.value.url, e, false);
}

// a bookmark made from a pasted address has no preview yet
onMounted(() => {
  if (!readonly.value && a.value.url && !a.value.title && !a.value.site) void refresh();
});
onBeforeUnmount(() => abort?.abort());
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-bookmark">
    <BlockFrame :label="t('bookmark.label')" :selected="selected" :editing="editing" :readonly="readonly" :copy-text="copyText" :editable="false" @delete="remove" @more="menu = !menu">
      <form v-if="editing || !a.url" class="wy-url-form" contenteditable="false" data-block-portal @mousedown.stop @submit.prevent="submit">
        <input ref="input" v-model="draft" class="wy-input" type="url" inputmode="url" autocomplete="off" spellcheck="false" :placeholder="t('bookmark.placeholder')" :aria-label="t('bookmark.url')" :readonly="readonly" @keydown.esc.prevent.stop="cancel" />
        <button type="submit" class="wy-btn is-primary" :disabled="!loneUrl(normalizeHref(draft))">{{ t("bookmark.create") }}</button>
      </form>
      <a v-else class="wy-bookmark-card" :class="{ 'is-loading': loading }" :href="a.url" target="_blank" rel="noopener noreferrer" contenteditable="false" draggable="false" @click="open">
        <span class="wy-bookmark-text">
          <span class="wy-bookmark-title">{{ loading && !a.title ? t("bookmark.loading") : title }}</span>
          <span v-if="a.description" class="wy-bookmark-desc">{{ a.description }}</span>
          <span class="wy-bookmark-url">
            <img v-if="a.icon && !failedIcon" class="wy-bookmark-favicon" :src="a.icon" alt="" @error="failedIcon = true" />
            <Globe v-else :size="14" aria-hidden="true" />
            <span>{{ a.url }}</span>
          </span>
        </span>
        <img v-if="a.image && !failedImage" class="wy-bookmark-image" :src="a.image" alt="" loading="lazy" @error="failedImage = true" />
      </a>
      <template #menu>
        <BlockMenu :open="menu" @close="menu = false">
          <button v-if="a.url && !readonly" type="button" class="wy-menu-item" role="menuitem" @click="(menu = false), startEdit()"><Pencil class="wy-menu-icon" :size="16" />{{ t("bookmark.edit") }}</button>
          <button v-if="a.url" type="button" class="wy-menu-item" role="menuitem" :disabled="loading" @click="refresh()"><RefreshCw class="wy-menu-icon" :size="16" />{{ t("bookmark.refresh") }}</button>
          <a v-if="a.url" class="wy-menu-item" role="menuitem" :href="a.url" target="_blank" rel="noopener noreferrer" @click="(menu = false), open($event)"><ExternalLink class="wy-menu-icon" :size="16" />{{ t("bookmark.open") }}</a>
        </BlockMenu>
      </template>
    </BlockFrame>
  </NodeViewWrapper>
</template>
