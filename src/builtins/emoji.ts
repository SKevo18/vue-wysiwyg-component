// `:smi` suggests emoji, `:smile:` becomes 😄 as it is typed, and "Emoji" in the slash menu opens the picker
import { Extension, InputRule, type Editor } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { SmilePlus } from "@lucide/vue";
import EmojiPopup from "../components/EmojiPopup.vue";
import SuggestionList, { type SuggestionEntry } from "../components/SuggestionList.vue";
import { emojiNow, loadEmoji, rememberEmoji, savedTone, searchEmoji, withTone, type Emoji } from "../core/emoji";
import { contextOf } from "../editor/context";
import { caretRect, openPopup, type Popup } from "../editor/popup";
import type { EditorExtension } from "../types";

interface EmojiEntry extends SuggestionEntry {
  emoji: Emoji;
}

/** the query length from which `:` suggests, so "a: b" or a time "10:30" stays quiet */
const MIN_QUERY = 2;
const LIMIT = 8;

const EMOJI_KEY = new PluginKey("wysiwygEmoji");

function insertEmoji(editor: Editor, e: Emoji, range: { from: number; to: number }) {
  rememberEmoji(e.emoji);
  editor.chain().focus().insertContentAt(range, withTone(e, savedTone())).run();
}

export const EmojiSuggest = Extension.create({
  name: "emojiSuggest",
  addProseMirrorPlugins() {
    return [
      Suggestion<EmojiEntry>({
        editor: this.editor,
        char: ":",
        pluginKey: EMOJI_KEY,
        allowSpaces: false,
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: async ({ query }) => {
          if (query.length < MIN_QUERY || !/^[\p{L}\p{N}_+-]+$/u.test(query)) return [];
          const data = await loadEmoji();
          return searchEmoji(data, query, LIMIT).map((e) => ({ key: e.emoji, title: e.label, detail: e.shortcodes[0] ? `:${e.shortcodes[0]}:` : undefined, icon: withTone(e, savedTone()), emoji: e }));
        },
        command: ({ editor, range, props }) => insertEmoji(editor, props.emoji, range),
        render: () => {
          let popup: Popup | null = null;
          type P = { items: EmojiEntry[]; command: (e: EmojiEntry) => void; editor: Editor; clientRect?: (() => DOMRect | null) | null };
          const props = (p: P) => ({ items: p.items, label: contextOf(p.editor).t("emoji.label"), onPick: p.command });
          // nothing to suggest leaves the text alone
          const show = (p: P) => {
            if (!p.items.length) {
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
              popup?.close();
              popup = null;
            },
          };
        },
      }),
    ];
  },
  addInputRules() {
    return [
      new InputRule({
        // `:smile:` after a space or at the start of a line, once the data has loaded
        find: /(?:^|\s)(:([a-z0-9_+-]{2,}):)$/,
        handler: ({ state, range, match }) => {
          const e = emojiNow()?.byShortcode.get(match[2]!);
          if (!e) return null;
          const from = range.to - match[1]!.length;
          rememberEmoji(e.emoji);
          state.tr.insertText(withTone(e, savedTone()), from, range.to);
        },
      }),
    ];
  },
});

/** the full picker at `at`; the picked emoji goes there */
export function openEmojiPicker(editor: Editor, at: number) {
  const ctx = contextOf(editor);
  let popup: Popup | null = null;
  const close = () => {
    popup?.close();
    popup = null;
  };
  popup = openPopup(
    editor,
    EmojiPopup,
    {
      t: ctx.t,
      onPick: (emoji: string) => {
        close();
        const pos = Math.min(at, editor.state.doc.content.size);
        editor.chain().focus().insertContentAt(pos, emoji).run();
      },
      onClose: () => {
        close();
        editor.commands.focus();
      },
    },
    caretRect(editor, at),
  );
}

export const emojiExtension: EditorExtension = {
  name: "emoji",
  tiptap: [EmojiSuggest],
  slash: [
    {
      id: "emoji",
      group: "blocks",
      rank: 48,
      label: "",
      icon: SmilePlus,
      inline: true,
      keywords: "emoji smiley icon reaction",
      run: (c) => {
        const at = c.range?.from ?? c.editor.state.selection.from;
        c.clear();
        openEmojiPicker(c.editor, at);
      },
    },
  ],
};
