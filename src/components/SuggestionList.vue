<script setup lang="ts">
// keyboard: the owner forwards keydown through the exposed onKeyDown (the caret stays in the editor or an input)
import { computed, nextTick, ref, watch, type Component } from "vue";

export interface SuggestionEntry {
  key: string;
  title: string;
  detail?: string;
  /** a component, an image URL or an emoji */
  icon?: Component | string;
  group?: string;
}

const props = withDefaults(defineProps<{ items: SuggestionEntry[]; loading?: boolean; empty?: string; label?: string }>(), { loading: false, empty: "", label: "" });
const emit = defineEmits<{ pick: [entry: SuggestionEntry] }>();

const active = ref(0);
const list = ref<HTMLElement | null>(null);

const rows = computed(() => props.items.map((item, index) => ({ item, index, heading: item.group && item.group !== props.items[index - 1]?.group ? item.group : "" })));

watch(
  () => props.items,
  () => (active.value = 0),
);

const isImage = (icon: string) => /^(https?:|\/|data:image\/|blob:)/.test(icon);

async function reveal() {
  await nextTick();
  list.value?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
}

function onKeyDown(e: KeyboardEvent): boolean {
  const n = props.items.length;
  if (!n) return false;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    active.value = (active.value + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
    void reveal();
    return true;
  }
  if (e.key === "Enter" || e.key === "Tab") {
    const item = props.items[active.value];
    if (item) emit("pick", item);
    return true;
  }
  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div ref="list" class="wy-suggest" role="listbox" :aria-label="label || undefined" :aria-busy="loading || undefined">
    <template v-for="{ item, index, heading } in rows" :key="item.key">
      <div v-if="heading" class="wy-menu-heading" role="presentation">{{ heading }}</div>
      <button
        type="button"
        role="option"
        class="wy-menu-item wy-suggest-item"
        :class="{ 'is-active': index === active }"
        :aria-selected="index === active"
        :data-index="index"
        @mousedown.prevent
        @mouseenter="active = index"
        @click="emit('pick', item)"
      >
        <span class="wy-suggest-icon" aria-hidden="true">
          <component :is="item.icon" v-if="item.icon && typeof item.icon !== 'string'" :size="18" />
          <img v-else-if="item.icon && isImage(item.icon)" :src="item.icon" alt="" />
          <span v-else-if="item.icon">{{ item.icon }}</span>
        </span>
        <span class="wy-suggest-text">
          <span class="wy-suggest-title">{{ item.title }}</span>
          <span v-if="item.detail" class="wy-suggest-detail">{{ item.detail }}</span>
        </span>
      </button>
    </template>
    <p v-if="!items.length && empty" class="wy-menu-hint">{{ empty }}</p>
  </div>
</template>
