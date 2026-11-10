<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { SlashItem } from "../types";

const props = defineProps<{ items: SlashItem[]; command: (item: SlashItem) => void; inCell?: boolean; groupLabel: (id: string) => string; t: (key: string) => string }>();

const active = ref(0);
const list = ref<HTMLElement | null>(null);

const groups = computed(() => {
  const out: { group: string; items: { item: SlashItem; index: number }[] }[] = [];
  props.items.forEach((item, index) => {
    let g = out.find((x) => x.group === item.group);
    if (!g) out.push((g = { group: item.group, items: [] }));
    g.items.push({ item, index });
  });
  return out;
});

const enabled = (i: number) => !props.inCell || !!props.items[i]?.inline;

watch(
  () => [props.items, props.inCell],
  () => {
    active.value = Math.max(0, props.items.findIndex((_, i) => enabled(i)));
  },
  { immediate: true },
);

async function reveal() {
  await nextTick();
  list.value?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
}

function select(i: number) {
  const item = props.items[i];
  if (item && enabled(i)) props.command(item);
}

function step(dir: 1 | -1) {
  const n = props.items.length;
  for (let k = 1; k <= n; k++) {
    const i = (((active.value + dir * k) % n) + n) % n;
    if (enabled(i)) {
      active.value = i;
      return;
    }
  }
}

function onKeyDown(e: KeyboardEvent): boolean {
  if (props.items.length === 0) return false;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    step(e.key === "ArrowDown" ? 1 : -1);
    void reveal();
    return true;
  }
  if (e.key === "Enter" || e.key === "Tab") {
    select(active.value);
    return true;
  }
  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div class="wy-menu wy-slash" role="listbox" :aria-label="t('slash.title')">
    <div v-if="items.length === 0" class="wy-menu-empty">{{ t("slash.empty") }}</div>
    <div v-else ref="list" class="wy-slash-list">
      <template v-for="g in groups" :key="g.group">
        <div class="wy-menu-heading" role="presentation">{{ groupLabel(g.group) }}</div>
        <button
          v-for="{ item, index } in g.items"
          :key="item.id"
          type="button"
          role="option"
          class="wy-menu-item wy-slash-item"
          :class="{ 'is-active': index === active }"
          :aria-selected="index === active"
          :aria-disabled="!enabled(index) || undefined"
          :title="enabled(index) ? undefined : t('editor.inlineOnly')"
          :data-index="index"
          @mousedown.prevent
          @mouseenter="enabled(index) && (active = index)"
          @click="select(index)"
        >
          <component :is="item.icon" v-if="item.icon" class="wy-menu-icon" :size="18" aria-hidden="true" />
          <span class="wy-slash-text">
            <span class="wy-slash-label">{{ item.label }}</span>
            <span v-if="item.description" class="wy-slash-desc">{{ item.description }}</span>
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
