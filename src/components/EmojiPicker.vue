<script setup lang="ts">
// the full emoji picker: search, categories, skin tone and recently used. the data loads on first open
import { computed, inject, nextTick, onMounted, ref, shallowRef, type Component } from "vue";
import { Apple, Car, Clock, Flag, Hand, Heart, Lightbulb, PawPrint, Smile, Volleyball } from "@lucide/vue";
import { EMOJI_GROUPS, loadEmoji, recentEmoji, rememberEmoji, saveTone, savedTone, searchEmoji, withTone, type Emoji, type EmojiData } from "../core/emoji";
import { EDITOR_CONTEXT } from "../editor/context";
import { MESSAGES, createTranslator, type Translate } from "../i18n";

const props = withDefaults(defineProps<{ value?: string; t?: Translate; autofocus?: boolean }>(), { value: "", t: undefined, autofocus: true });
const emit = defineEmits<{ pick: [emoji: string] }>();
const ctx = inject(EDITOR_CONTEXT, null);
const t = computed<Translate>(() => props.t ?? ctx?.t ?? createTranslator([MESSAGES.en]));

const ICONS: Record<number, Component> = { 0: Smile, 1: Hand, 3: PawPrint, 4: Apple, 5: Car, 6: Volleyball, 7: Lightbulb, 8: Heart, 9: Flag };
const TONE_SAMPLES = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];

const data = shallowRef<EmojiData | null>(null);
const failed = ref(false);
const query = ref("");
const tone = ref(savedTone());
const toneOpen = ref(false);
const hovered = shallowRef<Emoji | null>(null);
const recent = ref(recentEmoji());
const body = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);

const byEmoji = computed(() => new Map((data.value?.list ?? []).map((e) => [e.emoji, e])));
const results = computed(() => (data.value && query.value.trim() ? searchEmoji(data.value, query.value, 120) : null));
const sections = computed(() => {
  const list = data.value?.list ?? [];
  const out: { id: string; label: string; icon: Component; items: Emoji[] }[] = [];
  const rec = recent.value.map((x) => byEmoji.value.get(x)).filter((e): e is Emoji => !!e);
  if (rec.length) out.push({ id: "recent", label: t.value("emoji.recent"), icon: Clock, items: rec });
  for (const g of EMOJI_GROUPS) out.push({ id: `g${g}`, label: t.value(`emoji.groups.${g}`), icon: ICONS[g]!, items: list.filter((e) => e.group === g) });
  return out;
});

onMounted(async () => {
  if (props.autofocus) {
    await nextTick();
    input.value?.focus({ preventScroll: true });
  }
  try {
    data.value = await loadEmoji();
  } catch {
    failed.value = true;
  }
});

function pick(e: Emoji) {
  const v = withTone(e, tone.value);
  rememberEmoji(e.emoji);
  recent.value = recentEmoji();
  emit("pick", v);
}

function setTone(n: number) {
  tone.value = n;
  saveTone(n);
  toneOpen.value = false;
}

function jump(id: string) {
  query.value = "";
  void nextTick(() => body.value?.querySelector<HTMLElement>(`[data-section="${id}"]`)?.scrollIntoView({ block: "start" }));
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    const first = results.value?.[0];
    if (first) pick(first);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    body.value?.querySelector<HTMLElement>(".wy-emoji")?.focus();
  }
}

/** arrow keys move through the grid of buttons */
function onGridKey(e: KeyboardEvent) {
  const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  const step = keys[e.key];
  if (step === undefined || !body.value) return;
  const all = [...body.value.querySelectorAll<HTMLElement>(".wy-emoji")];
  const i = all.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  if (i + step < 0) input.value?.focus();
  else all[Math.min(all.length - 1, i + step)]?.focus();
}
</script>

<template>
  <div class="wy-emoji-picker">
    <div class="wy-emoji-top">
      <input ref="input" v-model="query" class="wy-input is-sm" type="search" autocomplete="off" spellcheck="false" :placeholder="t('emoji.search')" :aria-label="t('emoji.search')" @keydown="onKey" />
      <div class="wy-emoji-tone">
        <button type="button" class="wy-icon-btn" :title="t('emoji.tone')" :aria-label="t('emoji.tone')" :aria-expanded="toneOpen" @click="toneOpen = !toneOpen">{{ TONE_SAMPLES[tone] }}</button>
        <div v-if="toneOpen" class="wy-emoji-tones" role="radiogroup" :aria-label="t('emoji.tone')">
          <button v-for="(s, i) in TONE_SAMPLES" :key="i" type="button" class="wy-emoji" role="radio" :aria-checked="i === tone" :aria-label="t(`emoji.tones.${i}`)" @click="setTone(i)">{{ s }}</button>
        </div>
      </div>
    </div>
    <nav v-if="!results" class="wy-emoji-tabs" :aria-label="t('emoji.categories')">
      <button v-for="s in sections" :key="s.id" type="button" class="wy-icon-btn" :title="s.label" :aria-label="s.label" @click="jump(s.id)"><component :is="s.icon" :size="16" /></button>
    </nav>
    <div ref="body" class="wy-emoji-body" @keydown="onGridKey">
      <p v-if="failed" class="wy-menu-hint">{{ t("emoji.failed") }}</p>
      <p v-else-if="!data" class="wy-menu-hint">{{ t("emoji.loading") }}</p>
      <template v-else-if="results">
        <p v-if="!results.length" class="wy-menu-hint">{{ t("emoji.empty") }}</p>
        <div class="wy-emoji-grid" role="listbox" :aria-label="t('emoji.results')">
          <button v-for="e in results" :key="e.emoji" type="button" role="option" class="wy-emoji" :aria-selected="e.emoji === value" :aria-label="e.label" @mouseenter="hovered = e" @focus="hovered = e" @click="pick(e)">{{ withTone(e, tone) }}</button>
        </div>
      </template>
      <template v-else>
        <section v-for="s in sections" :key="s.id" class="wy-emoji-section" :data-section="s.id">
          <div class="wy-menu-heading">{{ s.label }}</div>
          <div class="wy-emoji-grid" role="listbox" :aria-label="s.label">
            <button v-for="e in s.items" :key="e.emoji" type="button" role="option" class="wy-emoji" :aria-selected="e.emoji === value" :aria-label="e.label" @mouseenter="hovered = e" @focus="hovered = e" @click="pick(e)">{{ withTone(e, tone) }}</button>
          </div>
        </section>
      </template>
    </div>
    <div class="wy-emoji-foot">
      <span v-if="hovered" class="wy-emoji-preview"
        ><span class="wy-emoji-big" aria-hidden="true">{{ withTone(hovered, tone) }}</span><span class="wy-emoji-name">{{ hovered.label }}</span><code v-if="hovered.shortcodes[0]">:{{ hovered.shortcodes[0] }}:</code></span
      >
      <slot name="footer" />
    </div>
  </div>
</template>
