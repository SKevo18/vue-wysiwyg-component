<script setup lang="ts">
import { ref } from "vue";
import { validIcon } from "../core/attrs";

const props = defineProps<{ value: string; t: (key: string) => string }>();
const emit = defineEmits<{ pick: [icon: string] }>();

const EMOJIS = [
  "💡", "📌", "📝", "✅", "❌", "⚠️", "❗", "❓",
  "ℹ️", "🔥", "🚀", "🎯", "📣", "🔒", "🔑", "🛠️",
  "⚙️", "📎", "📅", "⏰", "💬", "👉", "⭐", "🧪",
  "🐛", "📦", "🔗", "📖", "🧭", "🏁", "❤️", "👍",
  "👀", "🎉", "🧠", "💰", "🌱", "☕", "🗂️", "📊",
  "🛡️", "🔍", "🚧", "📢", "🤝", "🏆", "🧩", "✏️",
];

const own = ref(EMOJIS.includes(props.value) ? "" : props.value);

function applyOwn() {
  const v = own.value.trim();
  if (validIcon(v)) emit("pick", v);
}
</script>

<template>
  <div class="wy-emoji-picker">
    <div class="wy-emoji-grid" role="listbox" :aria-label="t('callout.icon')">
      <button v-for="e in EMOJIS" :key="e" type="button" role="option" class="wy-emoji" :aria-selected="e === value" :aria-label="e" @mousedown.prevent @click="emit('pick', e)">{{ e }}</button>
    </div>
    <form class="wy-emoji-own" @submit.prevent="applyOwn">
      <input v-model="own" class="wy-input is-sm" maxlength="32" :placeholder="t('callout.ownIcon')" :aria-label="t('callout.ownIcon')" />
      <button type="submit" class="wy-btn is-sm" :disabled="!validIcon(own.trim())">{{ t("callout.useIcon") }}</button>
    </form>
    <button v-if="value" type="button" class="wy-menu-item" @mousedown.prevent @click="emit('pick', '')">{{ t("callout.defaultIcon") }}</button>
  </div>
</template>
