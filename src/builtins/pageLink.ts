import type { Editor } from "@tiptap/core";
import { FileSymlink } from "@lucide/vue";
import PageLinkView from "../nodes/PageLinkView.vue";
import type { SuggestionEntry } from "../components/SuggestionList.vue";
import { pageHref } from "../core/mentions";
import { contextOf } from "../editor/context";
import { mentionEntry, searchMentions, type MentionEntry } from "../editor/mentionItems";
import { openSearch } from "../editor/searchPopup";
import { AT_LINK, defineInlineBlock, escapeChipLabel, inlineBlockToken, unescapeChipLabel } from "../inline";
import type { EditorExtension, FenceContext, MentionSuggestion, ResolvedBase } from "../types";

export interface PageLinkAttrs {
  href: string;
  title: string;
  icon: string;
}

/** a page link target in markdown: a path, an http(s) address or `page:<id>` */
export const PAGE_HREF = /^(?:\/(?!\/)|https?:\/\/|page:)/;

/** `@[Title](href)`; the href percent encodes spaces and parentheses */
export function pageLinkMarkdown(a: PageLinkAttrs): string | null {
  const href = a.href.trim().replace(/[\s()\\]/g, (c) => (c === "(" ? "%28" : c === ")" ? "%29" : encodeURIComponent(c)));
  return PAGE_HREF.test(href) ? `@[${escapeChipLabel(a.title || href)}](${href})` : null;
}

/** where a page link goes: `page:<id>` through `base.pageHref`, other addresses as they are */
export function pageTarget(href: string, template: string): string {
  return href.startsWith("page:") ? pageHref(template, href.slice(5)) : href;
}

/** an emoji icon of a search result; image icons are left to `resolveLink` */
const emojiIcon = (icon: string | undefined) => (icon && !/^(https?:|\/|data:|blob:)/.test(icon) ? icon : "");

/** a page chip for a picked page at the caret, with a space after it when `space` */
export function insertPageLink(editor: Editor, s: MentionSuggestion, range: { from: number; to: number }, space: boolean) {
  const ctx = contextOf(editor);
  const attrs: PageLinkAttrs = { href: s.href ?? pageHref(ctx.config.base.pageHref, s.id), title: s.label, icon: emojiIcon(s.icon) };
  const content = [{ type: "pageLink", attrs }, ...(space ? [{ type: "text", text: " " }] : [])];
  editor.chain().focus().insertContentAt(range, content).run();
}

/** "Link to page": search pages and insert a page chip at `at` */
export function openPageSearch(editor: Editor, at: number) {
  const ctx = contextOf(editor);
  openSearch(editor, at, {
    search: async (q, signal) => (await searchMentions(ctx.services, q, "page", signal, ctx)).map((s) => mentionEntry(s, ctx)),
    placeholder: ctx.t("pageLink.searchPlaceholder"),
    label: ctx.t("pageLink.search"),
    onPick: (entry: SuggestionEntry, pos) => insertPageLink(editor, (entry as MentionEntry).suggestion, { from: pos, to: pos }, false),
  });
}

export function pageLinkExtension(base: ResolvedBase): EditorExtension {
  const ext = defineInlineBlock({
    name: "pageLink",
    attrs: { href: "", title: "", icon: "" },
    text: (a) => String(a.title || a.href || ""),
    view: PageLinkView,
    html: {
      class: "wy-page-link",
      href: (a) => pageTarget(String(a.href ?? ""), base.pageHref) || null,
      parse: [
        // the round 1 block and page mentions
        { tag: 'div[data-type="page-link"]', priority: 60 },
        {
          tag: 'a[data-type="mention"][data-kind="page"]',
          priority: 60,
          getAttrs: (dom: HTMLElement) => ({ href: `page:${dom.getAttribute("data-id") ?? ""}`, title: dom.getAttribute("data-label") ?? dom.textContent ?? "" }),
        },
      ],
    },
    markdown: {
      pattern: AT_LINK,
      parse: (m) => (PAGE_HREF.test(m[2]!) ? { href: m[2]!, title: unescapeChipLabel(m[1]!), icon: "" } : null),
      serialize: (a) => pageLinkMarkdown(a as unknown as PageLinkAttrs),
    },
    slash: [
      {
        id: "pageLink",
        group: "blocks",
        rank: 45,
        label: "",
        icon: FileSymlink,
        inline: true,
        keywords: "link to page subpage mention",
        enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.searchMentions,
        run: (c) => {
          const at = c.range?.from ?? c.editor.state.selection.from;
          c.clear();
          openPageSearch(c.editor, at);
        },
      },
    ],
  });
  // the round 1 block fence: a paragraph holding the chip, its color on the paragraph
  const legacy = {
    kind: "page",
    parse: (ctx: FenceContext) => {
      const a = ctx.info.attrs;
      ctx.inline(inlineBlockToken("pageLink"), { href: a.href ?? "", title: a.title ?? "", icon: a.icon ?? "" });
    },
  };
  return { ...ext, markdown: { ...ext.markdown, fences: [legacy] } };
}
