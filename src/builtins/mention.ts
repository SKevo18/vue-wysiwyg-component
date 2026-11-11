import { Extension, type Editor } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { AtSign, CalendarClock } from "@lucide/vue";
import MentionView from "../nodes/MentionView.vue";
import SuggestionList from "../components/SuggestionList.vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { dateLabel, isMentionDate, mentionMarkdown, parseMentionTarget, type MentionAttrs } from "../core/mentions";
import { contextOf } from "../editor/context";
import { dateSuggestions, mentionEntry, searchMentions, type MentionEntry } from "../editor/mentionItems";
import { openPopup, type Popup } from "../editor/popup";
import { openSearch } from "../editor/searchPopup";
import { AT_LINK, defineInlineBlock, unescapeChipLabel } from "../inline";
import type { EditorExtension, MentionSuggestion } from "../types";
import { insertPageLink } from "./pageLink";

export function mentionText(a: MentionAttrs, locale: string): string {
  if (a.kind === "date" && isMentionDate(a.start)) return a.label || dateLabel(a.start, isMentionDate(a.end) ? a.end : null, locale);
  return `@${a.label || a.id}`;
}

/** a picked user, date or page at `range`, followed by a space */
export function insertMention(editor: Editor, s: MentionSuggestion, range: { from: number; to: number }) {
  if (s.kind === "page") {
    insertPageLink(editor, s, range);
    return;
  }
  const attrs = { kind: s.kind, id: s.id, label: s.label, start: s.start ?? null, end: s.end ?? null, remind: !!s.remind };
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type: "mention", attrs },
      { type: "text", text: " " },
    ])
    .run();
}

/** words an `@` query may have: "@remind me next friday 9am" still searches, longer text is just text */
const MAX_WORDS = 5;

const MENTION_KEY = new PluginKey("wysiwygMention");

export const MentionSuggest = Extension.create({
  name: "mentionSuggest",
  addProseMirrorPlugins() {
    let abort: AbortController | null = null;
    return [
      Suggestion<MentionEntry>({
        editor: this.editor,
        char: "@",
        pluginKey: MENTION_KEY,
        allowSpaces: true,
        allow: ({ state, range }) => {
          if (state.doc.resolve(range.from).parent.type.spec.code || !state.schema.nodes.mention) return false;
          const query = state.doc.textBetween(range.from + 1, range.to, " ");
          return !/^\s/.test(query) && query.split(/\s+/).length <= MAX_WORDS;
        },
        items: async ({ query, editor }) => {
          abort?.abort();
          const ctrl = (abort = new AbortController());
          const ctx = contextOf(editor);
          // the host search runs at most once per pause in typing
          const pause = Promise.withResolvers<void>();
          setTimeout(pause.resolve, ctx.services.searchMentions ? 120 : 0);
          await pause.promise;
          if (ctrl.signal.aborted) return [];
          const pages = !!editor.schema.nodes.pageLink;
          const found = await searchMentions(ctx.services, query, undefined, ctrl.signal, ctx);
          return found.filter((s) => s.kind !== "page" || pages).map((s) => mentionEntry(s, ctx));
        },
        command: ({ editor, range, props }) => insertMention(editor, props.suggestion, range),
        render: () => {
          let popup: Popup | null = null;
          type P = { items: MentionEntry[]; query: string; command: (e: MentionEntry) => void; editor: Editor; clientRect?: (() => DOMRect | null) | null };
          const props = (p: P) => {
            const ctx = contextOf(p.editor);
            return { items: p.items, empty: ctx.services.searchMentions ? ctx.t("mention.empty") : "", label: ctx.t("mention.label"), onPick: p.command };
          };
          // a query that found nothing after a space is text being typed, so the menu gets out of the way
          const show = (p: P) => {
            const hidden = !p.items.length && /\s/.test(p.query);
            if (hidden) {
              popup?.close();
              popup = null;
            } else if (popup) popup.update(props(p));
            else popup = openPopup(p.editor, SuggestionList, props(p), () => p.clientRect?.() ?? null);
          };
          return {
            onStart: show,
            onUpdate: show,
            onKeyDown(p) {
              if (!popup) return false;
              if (p.event.key === "Escape") {
                p.event.stopPropagation();
                popup.close();
                popup = null;
                return true;
              }
              return (popup.ref as { onKeyDown?: (e: KeyboardEvent) => boolean } | null)?.onKeyDown?.(p.event) ?? false;
            },
            onExit() {
              abort?.abort();
              popup?.close();
              popup = null;
            },
          };
        },
      }),
    ];
  },
});

function caretAt(c: { range?: { from: number } | undefined; editor: Editor; clear(): void }): number {
  const at = c.range?.from ?? c.editor.state.selection.from;
  c.clear();
  return at;
}

export function mentionExtension(): EditorExtension {
  return defineInlineBlock({
    name: "mention",
    attrs: { kind: "user", id: "", label: "", start: null, end: null, remind: false },
    text: (a) => mentionText(a as unknown as MentionAttrs, "en"),
    view: MentionView,
    html: {
      class: (a) => `wy-mention is-${String(a.kind)}${a.remind ? " is-reminder" : ""}`,
      // page mentions of round 1 are page links now
      parse: [{ tag: '[data-type="mention"][data-kind="page"]', ignore: true, priority: 55 }],
    },
    markdown: {
      pattern: AT_LINK,
      parse: (m) => {
        const t = parseMentionTarget(m[2]!);
        return t ? { ...t, label: unescapeChipLabel(m[1]!) } : null;
      },
      serialize: (a) => mentionMarkdown(a as unknown as MentionAttrs),
    },
    tiptap: [MentionSuggest],
    slash: [
      {
        id: "mentionPerson",
        group: "blocks",
        rank: 46,
        label: "",
        icon: AtSign,
        inline: true,
        keywords: "mention person people user at",
        enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.searchMentions,
        run: (c) => {
          const ctx = contextOf(c.editor);
          openSearch(c.editor, caretAt(c), {
            search: async (q, signal) => (await searchMentions(ctx.services, q, "user", signal, ctx)).map((s) => mentionEntry(s, ctx)),
            placeholder: ctx.t("mention.personPlaceholder"),
            label: ctx.t("mention.person"),
            onPick: (e: SuggestionEntry, at) => insertMention(c.editor, (e as MentionEntry).suggestion, { from: at, to: at }),
          });
        },
      },
      {
        id: "date",
        group: "blocks",
        rank: 47,
        label: "",
        icon: CalendarClock,
        inline: true,
        keywords: "date reminder remind today tomorrow time deadline due",
        run: (c) => {
          const ctx = contextOf(c.editor);
          openSearch(c.editor, caretAt(c), {
            search: async (q) => dateSuggestions(q, ctx).map((s) => mentionEntry(s, ctx)),
            placeholder: ctx.t("mention.datePlaceholder"),
            label: ctx.t("mention.date"),
            onPick: (e: SuggestionEntry, at) => insertMention(c.editor, (e as MentionEntry).suggestion, { from: at, to: at }),
          });
        },
      },
    ],
  });
}
