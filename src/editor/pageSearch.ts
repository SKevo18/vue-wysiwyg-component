import type { Editor } from "@tiptap/core";
import PageSearch from "../components/PageSearch.vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { pageHref } from "../core/mentions";
import { contextOf } from "./context";
import { insertFresh } from "./fresh";
import { mentionEntry, searchMentions, type MentionEntry } from "./mentionItems";
import { caretRect, openPopup, type Popup } from "./popup";

let current: Popup | null = null;

/** "link to page": search pages and insert a pageLink block at `at` */
export function openPageSearch(editor: Editor, at: number) {
  current?.close();
  const ctx = contextOf(editor);
  const close = () => {
    current?.close();
    current = null;
  };
  const pick = (entry: SuggestionEntry) => {
    const s = (entry as MentionEntry).suggestion;
    close();
    const href = s.href ?? pageHref(ctx.config.base.pageHref, s.id);
    const pos = Math.min(at, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(pos).run();
    insertFresh(editor, "pageLink", { href, title: s.label, icon: s.icon && !/^(https?:|\/|data:|blob:)/.test(s.icon) ? s.icon : "" });
  };
  current = openPopup(
    editor,
    PageSearch,
    {
      search: async (q: string, signal: AbortSignal) => (await searchMentions(ctx.services, q, "page", signal, ctx)).map((s) => mentionEntry(s, ctx)),
      placeholder: ctx.t("pageLink.searchPlaceholder"),
      empty: ctx.t("mention.empty"),
      searching: ctx.t("mention.searching"),
      label: ctx.t("pageLink.search"),
      onPick: pick,
      onClose: () => {
        close();
        editor.commands.focus();
      },
    },
    caretRect(editor, at),
  );
}
