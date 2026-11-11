<script setup lang="ts">
// one field takes an address or, with `searchLinks`, a search. an address is offered as the first option; Enter and
// Apply take the active option (after a pending search when it is still running), never raw search text.
import { computed, nextTick, ref, watch } from "vue";
import { FileText, Globe, LoaderCircle } from "@lucide/vue";
import { useEditorContext } from "../editor/context";
import type { LinkSuggestion } from "../types";
import Modal from "./Modal.vue";

const props = defineProps<{ open: boolean; href: string; text: string; hasLink: boolean }>();
const emit = defineEmits<{ close: []; apply: [href: string, text: string]; remove: [] }>();
const ctx = useEditorContext();
const t = ctx.t;
const canSearch = !!ctx.services.searchLinks;

const query = ref("");
const text = ref("");
const hits = ref<LinkSuggestion[]>([]);
const active = ref(0);
const searching = ref(false);
const input = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
let timer = 0;
let abort: AbortController | null = null;
let enterPending = false;

const looksLikeUrl = (v: string) => /^([a-z][a-z0-9+.-]*:|\/|#|www\.)|^[^\s]+\.[a-z]{2,}(\/|$)/i.test(v.trim());
const address = computed(() => {
  const v = query.value.trim();
  return v && (!canSearch || looksLikeUrl(v)) ? v : "";
});
const searchable = computed(() => canSearch && !!query.value.trim() && !address.value);
/** what Enter can pick: the typed address, or the search results */
const options = computed<LinkSuggestion[]>(() => (address.value ? [{ href: address.value, title: address.value }] : searchable.value ? hits.value : []));
const listId = `wy-link-options-${Math.random().toString(36).slice(2, 8)}`;

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      window.clearTimeout(timer);
      abort?.abort();
      enterPending = false;
      return;
    }
    query.value = props.href;
    text.value = props.text;
    hits.value = [];
    active.value = 0;
    searching.value = false;
    await nextTick();
    input.value?.focus();
    input.value?.select();
  },
);

function onInput() {
  window.clearTimeout(timer);
  abort?.abort();
  enterPending = false;
  active.value = 0;
  if (!searchable.value) {
    hits.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  timer = window.setTimeout(async () => {
    const ctrl = (abort = new AbortController());
    try {
      const found = await ctx.services.searchLinks!(query.value.trim(), ctrl.signal);
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
  emit("apply", h.href, text.value.trim() || (h.href === h.title ? "" : h.title));
}

async function move(step: number) {
  const n = options.value.length;
  if (!n) return;
  active.value = (active.value + step + n) % n;
  await nextTick();
  list.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    void move(e.key === "ArrowDown" ? 1 : -1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    submit();
  }
}

function submit() {
  if (searching.value) {
    enterPending = true;
    return;
  }
  const hit = options.value[active.value];
  if (hit) pick(hit);
}
</script>

<template>
  <Modal :open="open" pass-wheel :title="t('link.title')" :close-label="t('dialog.close')" @close="emit('close')">
    <form class="wy-form wy-link-form" @submit.prevent="submit">
      <div class="wy-link-search">
        <input
          ref="input"
          v-model="query"
          class="wy-input"
          type="text"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
          role="combobox"
          aria-autocomplete="list"
          :aria-expanded="options.length > 0"
          :aria-controls="listId"
          :aria-activedescendant="options.length ? `${listId}-${active}` : undefined"
          :aria-label="canSearch ? t('link.searchPlaceholder') : t('link.url')"
          :placeholder="canSearch ? t('link.searchPlaceholder') : t('link.urlPlaceholder')"
          @input="onInput"
          @keydown="onKey"
        />
        <div v-if="address || searchable" :id="listId" ref="list" class="wy-link-options" role="listbox" :aria-label="t('link.results')" :aria-busy="searching || undefined">
          <div v-if="searching && !hits.length" class="wy-link-status" role="status"><LoaderCircle class="wy-spin" :size="15" aria-hidden="true" />{{ t("link.searching") }}</div>
          <div v-else-if="searchable && !hits.length" class="wy-link-status" role="status">{{ t("link.noResults") }}</div>
          <button
            v-for="(h, i) in options"
            :id="`${listId}-${i}`"
            :key="h.href"
            type="button"
            role="option"
            tabindex="-1"
            class="wy-link-option"
            :aria-selected="i === active"
            @mouseenter="active = i"
            @mousedown.prevent
            @click="pick(h)"
          >
            <span class="wy-link-option-icon" aria-hidden="true">
              <template v-if="h.icon">{{ h.icon }}</template>
              <Globe v-else-if="address" :size="16" />
              <FileText v-else :size="16" />
            </span>
            <span class="wy-link-option-text">
              <span class="wy-link-option-title">{{ address ? t("link.linkTo") : h.title }}</span>
              <span class="wy-link-option-detail">{{ address ? h.href : h.detail || h.href }}</span>
            </span>
          </button>
        </div>
      </div>
      <label class="wy-field">
        <span class="wy-label">{{ t("link.text") }}</span>
        <input v-model="text" class="wy-input" type="text" :placeholder="t('link.textPlaceholder')" />
      </label>
      <div class="wy-form-actions">
        <button v-if="hasLink" type="button" class="wy-btn is-danger" @click="emit('remove')">{{ t("link.remove") }}</button>
        <span class="wy-grow"></span>
        <button type="button" class="wy-btn" @click="emit('close')">{{ t("dialog.cancel") }}</button>
        <button type="submit" class="wy-btn is-primary" :disabled="!options.length && !searching">{{ t("link.apply") }}</button>
      </div>
    </form>
  </Modal>
</template>
