<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref, watch } from "vue";
import { CalendarDays, FileText } from "@lucide/vue";
import { mentionText } from "../builtins/mention";
import { dateLabel, isMentionDate, pageHref, type MentionAttrs } from "../core/mentions";
import { contextOf } from "../editor/context";
import { followLink, resolveOnce } from "../editor/navigate";
import { useBlockNode } from "../blocks/useBlockNode";
import AnchoredPopover from "../components/AnchoredPopover.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, update, readonly, onKeydown } = useBlockNode(props);
const anchor = ref<HTMLElement | null>(null);
const a = computed(() => props.node.attrs as MentionAttrs);
const href = computed(() => (a.value.kind === "page" && a.value.id ? pageHref(ctx.config.base.pageHref, a.value.id) : ""));
const resolved = ref<{ title: string; icon?: string } | null>(null);
const text = computed(() => (a.value.kind === "page" && resolved.value?.title) || mentionText(a.value, ctx.locale));
// an emoji icon; image icons stay out of the line of text
const icon = computed(() => (/^(https?:|\/|data:|blob:)/.test(resolved.value?.icon ?? "") ? "" : resolved.value?.icon || ""));

watch(
  href,
  async (h) => {
    resolved.value = null;
    const r = await resolveOnce(ctx.services, h);
    if (h === href.value) resolved.value = r;
  },
  { immediate: true },
);

const startDate = computed(() => (a.value.start ?? "").slice(0, 10));
const startTime = computed(() => (a.value.start ?? "").slice(11, 16));
const endDate = computed(() => (a.value.end ?? "").slice(0, 10));
const withTime = computed(() => (a.value.start ?? "").includes("T"));

/** date attributes and a fresh label in the editor's locale */
function setDate(next: { date?: string; time?: string | null; end?: string | null }) {
  const date = next.date ?? startDate.value;
  if (!isMentionDate(date)) return;
  const time = next.time === undefined ? startTime.value : next.time;
  const start = time ? `${date}T${time}` : date;
  const endDay = next.end === undefined ? endDate.value : next.end;
  const end = endDay && isMentionDate(endDay) ? (time ? `${endDay}T${time}` : endDay) : null;
  update({ start, end, label: dateLabel(start, end, ctx.locale) });
}

function onClick(e: MouseEvent) {
  if (a.value.kind === "page" && href.value) followLink(ctx.services, href.value, e, true);
  else if (a.value.kind === "date" && !readonly.value) startEdit();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    finishEdit();
  }
}
</script>

<template>
  <NodeViewWrapper as="span" class="wy-inline-atom wy-mention-atom" :class="{ 'is-selected': selected, 'is-editing': editing }">
    <a v-if="a.kind === 'page'" ref="anchor" class="wy-mention is-page" :href="href || undefined" draggable="false" @click="onClick">
      <span class="wy-mention-icon" aria-hidden="true"><template v-if="icon">{{ icon }}</template><FileText v-else :size="14" /></span>{{ text }}</a
    ><span v-else ref="anchor" class="wy-mention" :class="`is-${a.kind}`" :title="a.kind === 'date' && !readonly ? t('mention.editDate') : undefined" @click="onClick"
      ><CalendarDays v-if="a.kind === 'date'" class="wy-mention-icon" :size="14" aria-hidden="true" />{{ text }}</span
    >
    <AnchoredPopover v-if="editing && a.kind === 'date'" :anchor="anchor" class="wy-popover wy-date-picker" @escape="onKeydown">
      <label class="wy-field">
        <span class="wy-label">{{ t("mention.date") }}</span>
        <input class="wy-input is-sm" type="date" :value="startDate" @change="setDate({ date: ($event.target as HTMLInputElement).value })" @keydown="onKey" />
      </label>
      <label class="wy-check">
        <input type="checkbox" :checked="withTime" @change="setDate({ time: ($event.target as HTMLInputElement).checked ? '09:00' : null })" />
        {{ t("mention.includeTime") }}
      </label>
      <input v-if="withTime" class="wy-input is-sm" type="time" :value="startTime" :aria-label="t('mention.time')" @change="setDate({ time: ($event.target as HTMLInputElement).value || null })" @keydown="onKey" />
      <label class="wy-check">
        <input type="checkbox" :checked="!!endDate" @change="setDate({ end: ($event.target as HTMLInputElement).checked ? startDate : null })" />
        {{ t("mention.endDate") }}
      </label>
      <input v-if="endDate" class="wy-input is-sm" type="date" :value="endDate" :min="startDate" :aria-label="t('mention.endDate')" @change="setDate({ end: ($event.target as HTMLInputElement).value || null })" @keydown="onKey" />
    </AnchoredPopover>
  </NodeViewWrapper>
</template>
