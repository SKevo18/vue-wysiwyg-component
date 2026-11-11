<script setup lang="ts">
// a search field over a SuggestionList; the link dialog can reuse it with another `search`
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import SuggestionList, { type SuggestionEntry } from "./SuggestionList.vue";

const props = defineProps<{
  search: (query: string, signal: AbortSignal) => Promise<SuggestionEntry[]>;
  placeholder: string;
  empty: string;
  searching: string;
  label: string;
}>();
const emit = defineEmits<{ pick: [entry: SuggestionEntry]; close: [] }>();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const list = ref<InstanceType<typeof SuggestionList> | null>(null);
const query = ref("");
const items = ref<SuggestionEntry[]>([]);
const loading = ref(false);
let timer = 0;
let abort: AbortController | null = null;

function run() {
  window.clearTimeout(timer);
  abort?.abort();
  loading.value = true;
  timer = window.setTimeout(async () => {
    const ctrl = (abort = new AbortController());
    try {
      const found = await props.search(query.value.trim(), ctrl.signal);
      if (!ctrl.signal.aborted) items.value = found;
    } catch {
      if (!ctrl.signal.aborted) items.value = [];
    } finally {
      if (!ctrl.signal.aborted) loading.value = false;
    }
  }, 150);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("close");
    return;
  }
  if (list.value?.onKeyDown(e)) e.preventDefault();
}

function onDocDown(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) emit("close");
}

onMounted(async () => {
  document.addEventListener("mousedown", onDocDown, true);
  run();
  await nextTick();
  input.value?.focus();
});
onBeforeUnmount(() => {
  window.clearTimeout(timer);
  abort?.abort();
  document.removeEventListener("mousedown", onDocDown, true);
});
</script>

<template>
  <div ref="root" class="wy-menu wy-page-search" contenteditable="false">
    <input ref="input" v-model="query" class="wy-input is-sm" type="search" autocomplete="off" spellcheck="false" :placeholder="placeholder" :aria-label="label" @input="run" @keydown="onKey" />
    <SuggestionList ref="list" :items="items" :loading="loading" :empty="loading ? searching : empty" :label="label" @pick="emit('pick', $event)" />
  </div>
</template>
