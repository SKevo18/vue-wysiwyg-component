import type { Component } from "vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import type { EditorServices, MentionKind, MentionSuggestion } from "../types";
import type { EditorContext } from "./context";
export interface MentionEntry extends SuggestionEntry {
    suggestion: MentionSuggestion;
}
export declare const MENTION_ICONS: Record<MentionKind, Component>;
export declare function mentionEntry(s: MentionSuggestion, ctx: Pick<EditorContext, "t">): MentionEntry;
/** today, tomorrow, yesterday and an ISO date typed as the query */
export declare function dateSuggestions(query: string, ctx: Pick<EditorContext, "t" | "locale">): MentionSuggestion[];
/** host results (users and pages) after the matching dates; aborted searches resolve to [] */
export declare function searchMentions(services: EditorServices, query: string, kind: MentionKind | undefined, signal: AbortSignal, ctx: Pick<EditorContext, "t" | "locale">): Promise<MentionSuggestion[]>;
