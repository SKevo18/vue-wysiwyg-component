import { Bell, CalendarDays, FileText, User } from "@lucide/vue";
import type { Component } from "vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { completeNaturalDate, parseNaturalDate } from "../core/dates";
import { dateLabel, isoDate } from "../core/mentions";
import type { EditorServices, MentionKind, MentionSuggestion } from "../types";
import type { EditorContext } from "./context";

export interface MentionEntry extends SuggestionEntry {
  suggestion: MentionSuggestion;
}

export const MENTION_ICONS: Record<MentionKind, Component> = { user: User, page: FileText, date: CalendarDays };

export function mentionEntry(s: MentionSuggestion, ctx: Pick<EditorContext, "t">): MentionEntry {
  return {
    key: `${s.kind}:${s.id || s.start || s.label}${s.remind ? "!" : ""}`,
    title: s.label,
    detail: s.detail,
    icon: s.icon || (s.remind ? Bell : MENTION_ICONS[s.kind]),
    group: ctx.t(s.remind ? "mention.groups.reminder" : `mention.groups.${s.kind}`),
    suggestion: s,
  };
}

const MAX_DATES = 5;

/**
 * dates the query names. empty: today, tomorrow and yesterday. otherwise the parsed phrase ("next friday 9am",
 * "remind me tomorrow", "2024-05-01"), the translated day names it starts and the English phrases it starts
 */
export function dateSuggestions(query: string, ctx: Pick<EditorContext, "t" | "locale">, now: Date = new Date()): MentionSuggestion[] {
  const q = query.trim().replace(/\s+/g, " ");
  const lower = q.toLowerCase();
  const out: MentionSuggestion[] = [];
  const seen = new Set<string>();
  const add = (start: string, remind: boolean, detail: string) => {
    const key = start + (remind ? "!" : "");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind: "date", id: "", label: dateLabel(start, null, ctx.locale), detail: remind ? ctx.t("mention.reminder") : detail, start, remind });
  };
  const day = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + offset);
    return isoDate(d);
  };
  const named = [
    { name: ctx.t("mention.today"), start: day(0) },
    { name: ctx.t("mention.tomorrow"), start: day(1) },
    { name: ctx.t("mention.yesterday"), start: day(-1) },
  ];
  const parsed = q ? parseNaturalDate(q, now) : null;
  if (parsed) add(parsed.start, parsed.remind, q.charAt(0).toUpperCase() + q.slice(1));
  for (const n of named) if (n.name.toLowerCase().startsWith(lower)) add(n.start, false, n.name);
  for (const phrase of completeNaturalDate(q)) {
    const p = parseNaturalDate(phrase, now);
    if (p) add(p.start, p.remind, phrase.charAt(0).toUpperCase() + phrase.slice(1));
  }
  return out.slice(0, MAX_DATES);
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
