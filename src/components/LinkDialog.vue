<script setup lang="ts">
// non-address text is a search: Enter and Apply take the active (or first pending) hit, never the raw query
import { computed, nextTick, ref, watch } from "vue";
import { useEditorContext } from "../editor/context";
import type { LinkSuggestion } from "../types";
import Modal from "./Modal.vue";

const props = defineProps<{ open: boolean; href: string; text: string; hasLink: boolean }>();
const emit = defineEmits<{ close: []; apply: [href: string, text: string]; remove: [] }>();
const ctx = useEditorContext();
const t = ctx.t;

const href = ref("");
const text = ref("");
const hits = ref<LinkSuggestion[]>([]);
const active = ref(0);
const searching = ref(false);
const input = ref<HTMLInputElement | null>(null);
let timer = 0;
let abort: AbortController | null = null;
let enterPending = false;

const looksLikeUrl = (v: string) => /^([a-z][a-z0-9+.-]*:|\/|#|www\.)|^[^\s]+\.[a-z]{2,}(\/|$)/i.test(v.trim());
const searchable = computed(() => !!ctx.services.searchLinks && !!href.value.trim() && !looksLikeUrl(href.value));

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      window.clearTimeout(timer);
      abort?.abort();
      enterPending = false;
      return;
    }
    href.value = props.href;
    text.value = props.text;
    hits.value = [];
    active.value = 0;
    await nextTick();
    input.value?.focus();
    input.value?.select();
  },
);

function onInput() {
  window.clearTimeout(timer);
  abort?.abort();
  enterPending = false;
  if (!searchable.value) {
    hits.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  timer = window.setTimeout(async () => {
    const ctrl = (abort = new AbortController());
    try {
      const found = await ctx.services.searchLinks!(href.value.trim(), ctrl.signal);
      if (ctrl.signal.aborted) return;
      hits.value = found.slice(0, 12);
      active.value = 0;
      const first = hits.value[0];
      if (enterPending && first) pick(first);
      enterPending = false;
    } catch {
      if (!ctrl.signal.aborted) hits.value = [];
    } finally {
      if (!ctrl.signal.aborted) searching.value = false;
    }
  }, 250);
}

function pick(h: LinkSuggestion) {
  emit("apply", h.href, text.value.trim() || h.title);
}

function onKey(e: KeyboardEvent) {
  const n = hits.value.length;
  if (e.key === "ArrowDown" && n) {
    e.preventDefault();
    active.value = (active.value + 1) % n;
  } else if (e.key === "ArrowUp" && n) {
    e.preventDefault();
    active.value = (active.value - 1 + n) % n;
  } else if (e.key === "Enter") {
    e.preventDefault();
    submit();
  }
}

function submit() {
  if (searchable.value) {
    const hit = hits.value[active.value];
    if (searching.value) enterPending = true;
    else if (hit) pick(hit);
    return;
  }
  const h = href.value.trim();
  if (!h) return;
  emit("apply", h, text.value.trim());
}
</script>

<template>
  <Modal :open="open" :title="t('link.title')" :close-label="t('dialog.close')" @close="emit('close')">
    <form class="wy-form" @submit.prevent="submit">
      <label class="wy-field">
        <span class="wy-label">{{ ctx.services.searchLinks ? `${t("link.url")} / ${t("link.search")}` : t("link.url") }}</span>
        <input ref="input" v-model="href" class="wy-input" type="text" inputmode="url" autocomplete="off" spellcheck="false" :placeholder="ctx.services.searchLinks ? t('link.searchPlaceholder') : t('link.urlPlaceholder')" @input="onInput" @keydown="onKey" />
      </label>
      <div v-if="searchable" class="wy-link-hits" role="listbox" :aria-label="t('link.search')">
        <p v-if="!searching && !hits.length" class="wy-menu-hint">{{ t("link.noResults") }}</p>
        <button v-for="(h, i) in hits" :key="h.href" type="button" role="option" class="wy-menu-item" :class="{ 'is-active': i === active }" :aria-selected="i === active" @mouseenter="active = i" @click="pick(h)">
          <span class="wy-slash-text">
            <span class="wy-slash-label">{{ h.title }}</span>
            <span class="wy-slash-desc">{{ h.detail || h.href }}</span>
          </span>
        </button>
      </div>
      <label class="wy-field">
        <span class="wy-label">{{ t("link.text") }}</span>
        <input v-model="text" class="wy-input" type="text" :placeholder="t('link.textPlaceholder')" />
      </label>
      <div class="wy-form-actions">
        <button v-if="hasLink" type="button" class="wy-btn is-danger" @click="emit('remove')">{{ t("link.remove") }}</button>
        <span class="wy-grow"></span>
        <button type="button" class="wy-btn" @click="emit('close')">{{ t("dialog.cancel") }}</button>
        <button type="submit" class="wy-btn is-primary" :disabled="!href.trim()">{{ t("link.apply") }}</button>
      </div>
    </form>
  </Modal>
</template>
