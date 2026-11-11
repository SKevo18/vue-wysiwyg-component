import type { Editor } from "@tiptap/core";
import PageSearch from "../components/PageSearch.vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { contextOf } from "./context";
import { caretRect, openPopup, type Popup } from "./popup";

let current: Popup | null = null;

export interface SearchPopupOptions {
  search(query: string, signal: AbortSignal): Promise<SuggestionEntry[]>;
  placeholder: string;
  label: string;
  /** runs after the popup closed, with the caret position the popup was opened at */
  onPick(entry: SuggestionEntry, at: number): void;
}

/** a search field with results at the caret ("Link to page", "Mention a person", "Date or reminder") */
export function openSearch(editor: Editor, at: number, o: SearchPopupOptions) {
  current?.close();
  const ctx = contextOf(editor);
  const close = () => {
    current?.close();
    current = null;
  };
  current = openPopup(
    editor,
    PageSearch,
    {
      search: o.search,
      placeholder: o.placeholder,
      empty: ctx.t("mention.empty"),
      searching: ctx.t("mention.searching"),
      label: o.label,
      onPick: (entry: SuggestionEntry) => {
        close();
        o.onPick(entry, Math.min(at, editor.state.doc.content.size));
      },
      onClose: () => {
        close();
        editor.commands.focus();
      },
    },
    caretRect(editor, at),
  );
}
