// a lone URL pasted on an empty line stays a link and offers to become a bookmark or an embed, like Notion
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { AppWindow, Bookmark, Link } from "@lucide/vue";
import SuggestionList, { type SuggestionEntry } from "../components/SuggestionList.vue";
import { embedAttrs } from "../builtins/embed";
import { embedFor, loneUrl } from "../core/embeds";
import { contextOf } from "./context";
import { caretRect, openPopup, type Popup } from "./popup";
import { isInCell } from "./tables";

interface Pending {
  from: number;
  url: string;
}

export const PASTE_URL_KEY = new PluginKey("wysiwygPasteUrl");

export const PasteUrl = Extension.create({
  name: "pasteUrl",
  addProseMirrorPlugins() {
    const editor = this.editor;
    let menu: Popup | null = null;
    let pending: Pending | null = null;

    const close = () => {
      menu?.close();
      menu = null;
      pending = null;
    };

    /** the pasted paragraph, if it still holds just the address */
    const pastedBlock = (view: EditorView, p: Pending): { from: number; to: number } | null => {
      if (p.from > view.state.doc.content.size) return null;
      const $pos = view.state.doc.resolve(p.from);
      return $pos.parent.type.name === "paragraph" && $pos.parent.textContent === p.url ? { from: $pos.before(), to: $pos.after() } : null;
    };

    const pick = (entry: SuggestionEntry) => {
      const p = pending;
      close();
      if (!p || entry.key === "link") return;
      const view = editor.view;
      const block = pastedBlock(view, p);
      const { schema } = view.state;
      const node = entry.key === "bookmark" ? schema.nodes.bookmark?.create({ url: p.url }) : schema.nodes.embed?.create(embedAttrs(p.url));
      if (!block || !node) return;
      view.dispatch(view.state.tr.replaceWith(block.from, block.to, node).scrollIntoView());
      view.focus();
    };

    const open = (view: EditorView, p: Pending) => {
      const ctx = contextOf(editor);
      const schema = view.state.schema;
      const target = embedFor(p.url);
      const items: SuggestionEntry[] = [{ key: "link", title: ctx.t("paste.link"), icon: Link }];
      if (schema.nodes.bookmark) items.push({ key: "bookmark", title: ctx.t("paste.bookmark"), icon: Bookmark });
      if (schema.nodes.embed && target) items.push({ key: "embed", title: ctx.t("paste.embed"), detail: ctx.t(`embed.providers.${target.provider}`), icon: AppWindow });
      if (items.length < 2) return;
      pending = p;
      menu = openPopup(editor, SuggestionList, { items, label: ctx.t("paste.label"), onPick: pick }, caretRect(editor, p.from + p.url.length));
    };

    return [
      new Plugin({
        key: PASTE_URL_KEY,
        props: {
          handlePaste(view, event) {
            const url = loneUrl(event.clipboardData?.getData("text/plain") ?? "");
            const { $from, empty } = view.state.selection;
            if (!url || !empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size || isInCell($from)) return false;
            const link = view.state.schema.marks.link;
            const tr = view.state.tr.insertText(url, $from.pos);
            if (link) tr.addMark($from.pos, $from.pos + url.length, link.create({ href: url }));
            view.dispatch(tr);
            open(view, { from: $from.pos, url });
            return true;
          },
          handleKeyDown(_view, event) {
            if (!menu) return false;
            if (event.key === "Escape") {
              close();
              return true;
            }
            if ((menu.ref as { onKeyDown?: (e: KeyboardEvent) => boolean } | null)?.onKeyDown?.(event)) return true;
            close();
            return false;
          },
          handleDOMEvents: {
            blur: () => {
              close();
              return false;
            },
          },
        },
        view: () => ({
          update(view, prev) {
            if (menu && (view.state.doc !== prev.doc || !view.state.selection.eq(prev.selection))) close();
          },
          destroy: close,
        }),
      }),
    ];
  },
});
