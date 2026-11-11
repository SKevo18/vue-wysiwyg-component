<script setup lang="ts">
import { nodeViewProps } from "@tiptap/vue-3";
import { computed, ref } from "vue";
import { Bell, CalendarDays } from "@lucide/vue";
import { mentionText } from "../builtins/mention";
import { dateLabel, isMentionDate, type MentionAttrs } from "../core/mentions";
import { contextOf } from "../editor/context";
import { useBlockNode } from "../blocks/useBlockNode";
import InlineChip from "../blocks/InlineChip.vue";
import AnchoredPopover from "../components/AnchoredPopover.vue";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, update, readonly, onKeydown } = useBlockNode(props);
const anchor = ref<HTMLElement | null>(null);
const a = computed(() => props.node.attrs as MentionAttrs);
const text = computed(() => mentionText(a.value, ctx.locale));

const startDate = computed(() => (a.value.start ?? "").slice(0, 10));
const startTime = computed(() => (a.value.start ?? "").slice(11, 16));
const endDate = computed(() => (a.value.end ?? "").slice(0, 10));
const withTime = computed(() => (a.value.start ?? "").includes("T"));
// a reminder whose moment has passed
const overdue = computed(() => {
  if (!a.value.remind || !isMentionDate(a.value.start)) return false;
  const [d, time] = a.value.start.split("T");
  const [y, m, day] = d!.split("-").map(Number) as [number, number, number];
  const [hh, mm] = (time ?? "23:59").split(":").map(Number) as [number, number];
  return new Date(y, m - 1, day, hh, mm) < new Date();
});

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

function onClick() {
  if (a.value.kind === "date" && !readonly.value) startEdit();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    finishEdit();
  }
}
</script>

<template>
  <InlineChip :selected="selected" :editing="editing" class="wy-mention-atom">
    <span
      ref="anchor"
      class="wy-mention"
      :class="[`is-${a.kind}`, { 'is-reminder': a.remind, 'is-overdue': overdue }]"
      :title="a.kind === 'date' && !readonly ? t(a.remind ? 'mention.editReminder' : 'mention.editDate') : undefined"
      @click="onClick"
      ><Bell v-if="a.kind === 'date' && a.remind" class="wy-mention-icon" :size="14" aria-hidden="true" /><CalendarDays v-else-if="a.kind === 'date'" class="wy-mention-icon" :size="14" aria-hidden="true" />{{ text }}</span
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
      <label class="wy-check">
        <input type="checkbox" :checked="a.remind" @change="update({ remind: ($event.target as HTMLInputElement).checked })" />
        {{ t("mention.remind") }}
      </label>
    </AnchoredPopover>
  </InlineChip>
</template>
