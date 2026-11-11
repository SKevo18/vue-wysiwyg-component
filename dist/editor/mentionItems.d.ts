import type { Component } from "vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import type { EditorServices, MentionKind, MentionSuggestion } from "../types";
import type { EditorContext } from "./context";
export interface MentionEntry extends SuggestionEntry {
    suggestion: MentionSuggestion;
}
export declare const MENTION_ICONS: Record<MentionKind, Component>;
export declare function mentionEntry(s: MentionSuggestion, ctx: Pick<EditorContext, "t">): MentionEntry;
/**
 * dates the query names. empty: today, tomorrow and yesterday. otherwise the parsed phrase ("next friday 9am",
 * "remind me tomorrow", "2024-05-01"), the translated day names it starts and the English phrases it starts
 */
export declare function dateSuggestions(query: string, ctx: Pick<EditorContext, "t" | "locale">, now?: Date): MentionSuggestion[];
/** host results (users and pages) after the matching dates; aborted searches resolve to [] */
export declare function searchMentions(services: EditorServices, query: string, kind: MentionKind | undefined, signal: AbortSignal, ctx: Pick<EditorContext, "t" | "locale">): Promise<MentionSuggestion[]>;
