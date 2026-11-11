import type { Editor } from "@tiptap/core";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
export interface SearchPopupOptions {
    search(query: string, signal: AbortSignal): Promise<SuggestionEntry[]>;
    placeholder: string;
    label: string;
    /** runs after the popup closed, with the caret position the popup was opened at */
    onPick(entry: SuggestionEntry, at: number): void;
}
/** a search field with results at the caret ("Link to page", "Mention a person", "Date or reminder") */
export declare function openSearch(editor: Editor, at: number, o: SearchPopupOptions): void;
