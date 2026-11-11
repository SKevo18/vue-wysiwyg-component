<script setup lang="ts">
// "Turn into" targets under a search field that filters them while typing; arrows move, Enter picks. `inserts` are
// slash items offered as well (an empty paragraph can become any block).
import { computed, ref, watch } from "vue";
import type { ResolvedTarget } from "../editor/convert";
import { useEditorContext } from "../editor/context";
import type { SlashItem } from "../types";

const props = withDefaults(defineProps<{ targets: ResolvedTarget[]; inserts?: SlashItem[] }>(), { inserts: () => [] });
const emit = defineEmits<{ pick: [target: string]; insert: [item: SlashItem] }>();
const ctx = useEditorContext();
const t = ctx.t;
const query = ref("");
const active = ref(0);
const search = ref<HTMLInputElement | null>(null);
const listId = `wy-convert-${Math.random().toString(36).slice(2, 8)}`;

type Entry = { key: string; id: string; insert: boolean; label: string; icon: ResolvedTarget["icon"]; words: string; run: () => void };

function label(target: ResolvedTarget): string {
  return ctx.text(target.label, `convert.targets.${target.id}`) || ctx.text("", `slash.items.${target.id}.label`) || target.id;
}

const entries = computed<Entry[]>(() => {
  const inserted = new Set(props.inserts.map((i) => i.id));
  return [
    ...props.inserts.map((item) => ({ key: `insert:${item.id}`, id: item.id, insert: true, label: item.label, icon: item.icon, words: item.keywords, run: () => emit("insert", item) })),
    ...props.targets.filter((x) => !inserted.has(x.id)).map((x) => ({ key: x.id, id: x.id, insert: false, label: label(x), icon: x.icon, words: `${x.id} ${label(x)}`.toLowerCase(), run: () => emit("pick", x.id) })),
  ];
});

const shown = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length ? entries.value.filter((e) => words.every((w) => e.words.includes(w) || e.label.toLowerCase().includes(w))) : entries.value;
});

watch(shown, () => (active.value = 0));

function onKey(e: KeyboardEvent) {
  const n = shown.value.length;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp":
      if (n) active.value = (active.value + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      break;
    case "Enter":
      shown.value[active.value]?.run();
      break;
    case "Home":
    case "End":
      break;
    case "ArrowLeft":
    case "ArrowRight":
      // an empty field leaves them to the menu (back out of a submenu)
      if (!query.value) return;
      e.stopPropagation();
      return;
    default:
      return;
  }
  if (e.key !== "Home" && e.key !== "End") e.preventDefault();
  e.stopPropagation();
}

defineExpose({ focus: () => search.value?.focus({ preventScroll: true }) });
</script>

<template>
  <input
    ref="search"
    v-model="query"
    class="wy-input is-sm wy-convert-search"
    type="text"
    autocomplete="off"
    spellcheck="false"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded="true"
    :aria-controls="listId"
    :aria-activedescendant="shown.length ? `${listId}-${active}` : undefined"
    :aria-label="t('convert.search')"
    :placeholder="t('convert.search')"
    @keydown="onKey"
  />
  <div :id="listId" class="wy-menu-list" role="group">
    <button
      v-for="(entry, i) in shown"
      :id="`${listId}-${i}`"
      :key="entry.key"
      type="button"
      role="menuitem"
      tabindex="-1"
      class="wy-menu-item"
      :class="{ 'is-active': i === active }"
      :data-convert="entry.id"
      :data-insert="entry.insert || undefined"
      @mousedown.prevent
      @mouseenter="active = i"
      @click="entry.run()"
    >
      <component :is="entry.icon" v-if="entry.icon" class="wy-menu-icon" :size="16" aria-hidden="true" />
      <span>{{ entry.label }}</span>
    </button>
    <p v-if="!shown.length" class="wy-menu-empty">{{ t("convert.empty") }}</p>
  </div>
</template>
