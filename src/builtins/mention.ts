import { Extension, Node, mergeAttributes } from "@tiptap/core";
import MentionView from "../nodes/MentionView.vue";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import SuggestionList from "../components/SuggestionList.vue";
import { dateLabel, isMentionDate, mentionMarkdown, mentionRule, pageHref, type MentionAttrs } from "../core/mentions";
import { contextOf } from "../editor/context";
import { mentionEntry, searchMentions, type MentionEntry } from "../editor/mentionItems";
import { openPopup, type Popup } from "../editor/popup";
import type { EditorExtension, MentionKind, ResolvedBase } from "../types";

const KINDS: readonly MentionKind[] = ["user", "page", "date"];

function attr(name: string, fallback: string | null) {
  return {
    default: fallback,
    parseHTML: (dom: HTMLElement) => dom.getAttribute(`data-${name}`) ?? fallback,
    renderHTML: (a: Record<string, unknown>) => (a[name] ? { [`data-${name}`]: String(a[name]) } : {}),
  };
}

export function mentionText(a: MentionAttrs, locale: string): string {
  if (a.kind === "date" && isMentionDate(a.start)) return a.label || dateLabel(a.start, isMentionDate(a.end) ? a.end : null, locale);
  return a.kind === "user" ? `@${a.label || a.id}` : a.label || a.id;
}

export const Mention = Node.create<{ pageHref: string }>({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions() {
    return { pageHref: "/p/{id}" };
  },
  addAttributes() {
    return {
      kind: { default: "user", parseHTML: (dom: HTMLElement) => (KINDS as readonly string[]).find((k) => k === dom.getAttribute("data-kind")) ?? "user", renderHTML: (a: { kind: string }) => ({ "data-kind": a.kind }) },
      id: attr("id", ""),
      label: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-label") ?? dom.textContent?.replace(/^@/, "") ?? "", renderHTML: (a: { label: string }) => ({ "data-label": a.label }) },
      start: attr("start", null),
      end: attr("end", null),
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="mention"][data-kind]' }, { tag: 'a[data-type="mention"][data-kind]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as MentionAttrs;
    const attrs = mergeAttributes({ "data-type": "mention", class: `wy-mention is-${a.kind}` }, HTMLAttributes);
    const text = mentionText(a, "en");
    if (a.kind === "page" && a.id) return ["a", mergeAttributes(attrs, { href: pageHref(this.options.pageHref, a.id) }), text];
    return ["span", attrs, text];
  },
  renderText({ node }) {
    return mentionText(node.attrs as MentionAttrs, "en");
  },
});

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
        allowSpaces: false,
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code && !!state.schema.nodes.mention,
        items: async ({ query, editor }) => {
          abort?.abort();
          const ctrl = (abort = new AbortController());
          const ctx = contextOf(editor);
          // the host search runs at most once per pause in typing
          const pause = Promise.withResolvers<void>();
          setTimeout(pause.resolve, ctx.services.searchMentions ? 120 : 0);
          await pause.promise;
          if (ctrl.signal.aborted) return [];
          return (await searchMentions(ctx.services, query, undefined, ctrl.signal, ctx)).map((s) => mentionEntry(s, ctx));
        },
        command: ({ editor, range, props }) => {
          const s = props.suggestion;
          const attrs = { kind: s.kind, id: s.id, label: s.label, start: s.start ?? null, end: s.end ?? null };
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: "mention", attrs },
              { type: "text", text: " " },
            ])
            .run();
        },
        render: () => {
          let popup: Popup | null = null;
          const props = (p: { items: MentionEntry[]; command: (e: MentionEntry) => void; editor: Parameters<typeof contextOf>[0] }) => {
            const ctx = contextOf(p.editor);
            return { items: p.items, empty: ctx.services.searchMentions ? ctx.t("mention.empty") : "", label: ctx.t("mention.label"), onPick: p.command };
          };
          return {
            onStart(p) {
              popup = openPopup(p.editor, SuggestionList, props(p), () => p.clientRect?.() ?? null);
            },
            onUpdate(p) {
              popup?.update(props(p));
            },
            onKeyDown(p) {
              if (p.event.key === "Escape") {
                p.event.stopPropagation();
                popup?.close();
                popup = null;
                return true;
              }
              return (popup?.ref as { onKeyDown?: (e: KeyboardEvent) => boolean } | null)?.onKeyDown?.(p.event) ?? false;
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

export function mentionExtension(base: ResolvedBase): EditorExtension {
  return {
    name: "mention",
    tiptap: [Mention.configure({ pageHref: base.pageHref }), MentionSuggest],
    nodeViews: { mention: MentionView },
    markdown: {
      plugins: [(md) => md.inline.ruler.before("link", "mention", mentionRule)],
      tokens: { mention: { node: "mention", getAttrs: (tok) => ({ ...tok.meta }) } },
      nodes: {
        mention(state, node) {
          const md = mentionMarkdown(node.attrs as MentionAttrs);
          if (md) state.write(md);
          else state.text(String(node.attrs.label ?? ""));
        },
      },
    },
  };
}
