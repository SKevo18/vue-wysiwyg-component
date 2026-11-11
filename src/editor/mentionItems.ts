import { CalendarDays, FileText, User } from "@lucide/vue";
import type { Component } from "vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { dateLabel, isoDate } from "../core/mentions";
import type { EditorServices, MentionKind, MentionSuggestion } from "../types";
import type { EditorContext } from "./context";

export interface MentionEntry extends SuggestionEntry {
  suggestion: MentionSuggestion;
}

export const MENTION_ICONS: Record<MentionKind, Component> = { user: User, page: FileText, date: CalendarDays };

export function mentionEntry(s: MentionSuggestion, ctx: Pick<EditorContext, "t">): MentionEntry {
  return {
    key: `${s.kind}:${s.id || s.start || s.label}`,
    title: s.label,
    detail: s.detail,
    icon: s.icon || MENTION_ICONS[s.kind],
    group: ctx.t(`mention.groups.${s.kind}`),
    suggestion: s,
  };
}

/** today, tomorrow, yesterday and an ISO date typed as the query */
export function dateSuggestions(query: string, ctx: Pick<EditorContext, "t" | "locale">): MentionSuggestion[] {
  const q = query.trim().toLowerCase();
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return isoDate(d);
  };
  const named = [
    { name: ctx.t("mention.today"), start: day(0) },
    { name: ctx.t("mention.tomorrow"), start: day(1) },
    { name: ctx.t("mention.yesterday"), start: day(-1) },
  ];
  const out: MentionSuggestion[] = named
    .filter((n) => !q || n.name.toLowerCase().startsWith(q))
    .map((n) => ({ kind: "date", id: "", label: dateLabel(n.start, null, ctx.locale), detail: n.name, start: n.start }));
  if (/^\d{4}-\d{2}-\d{2}$/.test(q) && !Number.isNaN(Date.parse(q))) out.unshift({ kind: "date", id: "", label: dateLabel(q, null, ctx.locale), start: q });
  return out;
}

/** host results (users and pages) after the matching dates; aborted searches resolve to [] */
export async function searchMentions(services: EditorServices, query: string, kind: MentionKind | undefined, signal: AbortSignal, ctx: Pick<EditorContext, "t" | "locale">): Promise<MentionSuggestion[]> {
  const dates = kind === undefined || kind === "date" ? dateSuggestions(query, ctx) : [];
  if (kind === "date" || !services.searchMentions) return dates;
  try {
    const found = await services.searchMentions(query, kind, signal);
    // grouped under one heading per kind: people, then pages
    const hits = found.filter((s) => !kind || s.kind === kind).slice(0, 12);
    return signal.aborted ? [] : [...hits.filter((s) => s.kind === "user"), ...hits.filter((s) => s.kind === "page"), ...dates];
  } catch {
    return signal.aborted ? [] : dates;
  }
}
