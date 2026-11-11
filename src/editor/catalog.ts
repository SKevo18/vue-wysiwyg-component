import type { Editor, Range } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { Columns3, FileCode2, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Image, List, ListOrdered, ListTodo, MessageSquareQuote, Minus, Paperclip, Quote } from "@lucide/vue";
import type { EditorConfig } from "../schema";
import type { EditorServices, SlashContext, SlashGroupDef, SlashItem, SlashItemDef } from "../types";
import type { FileController } from "./context";
import { insertFresh } from "./fresh";

const HEADING_ICONS = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6];

export const BASE_GROUPS: SlashGroupDef[] = [
  { id: "text", label: "", rank: 10 },
  { id: "lists", label: "", rank: 20 },
  { id: "blocks", label: "", rank: 30 },
  { id: "media", label: "", rank: 40 },
];

function chainAt(editor: Editor, range?: Range) {
  const c = editor.chain().focus();
  return range ? c.deleteRange(range) : c;
}

export function slashContext(editor: Editor, range: Range | undefined, services: EditorServices): SlashContext {
  let at = range;
  return {
    editor,
    services,
    get range() {
      return at;
    },
    insert: (type, attrs = {}, content) => insertFresh(editor, type, attrs, at, content),
    insertSections(type, child, count = 2) {
      const section = { type: child, content: [{ type: "paragraph" }] };
      chainAt(editor, at)
        .insertContent({ type, content: Array.from({ length: count }, () => section) })
        .command(({ tr }) => {
          const $head = tr.selection.$head;
          for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name !== type) continue;
            tr.setSelection(TextSelection.near(tr.doc.resolve($head.start(d) + 1)));
            break;
          }
          return true;
        })
        .run();
    },
    clear() {
      if (at) editor.chain().focus().deleteRange(at).run();
      at = undefined;
    },
    chain: () => chainAt(editor, at),
  };
}

function builtinItems(config: EditorConfig, files: FileController, services: EditorServices): SlashItemDef[] {
  const b = config.base;
  const canUpload = !!services.upload;
  const items: SlashItemDef[] = b.headings.map((level) => ({
    id: `heading${level}`,
    group: "text",
    rank: level,
    label: "",
    icon: HEADING_ICONS[level - 1],
    run: (c) => c.chain().setHeading({ level }).run(),
  }));
  if (b.blockquote) items.push({ id: "quote", group: "text", rank: 20, label: "", icon: Quote, run: (c) => c.chain().toggleBlockquote().run() });
  if (b.callouts.length) items.push({ id: "callout", group: "text", rank: 30, label: "", icon: MessageSquareQuote, run: (c) => c.chain().wrapIn("callout", { type: b.callouts[0], title: "" }).run() });
  if (b.codeBlocks) items.push({ id: "codeBlock", group: "text", rank: 50, label: "", icon: FileCode2, run: (c) => c.chain().setCodeBlock().run() });
  if (b.dividers) items.push({ id: "hr", group: "text", rank: 60, label: "", icon: Minus, run: (c) => c.chain().setHorizontalRule().run() });
  if (b.lists) {
    items.push({ id: "bulletList", group: "lists", rank: 10, label: "", icon: List, run: (c) => c.chain().toggleBulletList().run() });
    items.push({ id: "orderedList", group: "lists", rank: 20, label: "", icon: ListOrdered, run: (c) => c.chain().toggleOrderedList().run() });
  }
  if (b.taskLists) items.push({ id: "taskList", group: "lists", rank: 30, label: "", icon: ListTodo, run: (c) => c.chain().toggleTaskList().run() });
  if (b.tables) items.push({ id: "table", group: "blocks", rank: 10, label: "", icon: Columns3, run: (c) => c.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() });
  if (b.images && canUpload) {
    items.push({
      id: "image",
      group: "media",
      rank: 10,
      label: "",
      icon: Image,
      inline: true,
      run: (c) => {
        c.clear();
        void files.pick("image");
      },
    });
  }
  if (b.files && canUpload) {
    items.push({
      id: "file",
      group: "media",
      rank: 20,
      label: "",
      icon: Paperclip,
      inline: true,
      run: (c) => {
        c.clear();
        void files.pick("file");
      },
    });
  }
  return items;
}

export function slashCatalog(config: EditorConfig, files: FileController, services: EditorServices, text: (label: SlashItemDef["label"] | undefined, key?: string) => string): SlashItem[] {
  const groups = [...BASE_GROUPS, ...config.extensions.flatMap((e) => e.slashGroups ?? [])];
  const rankOf = (id: string) => groups.find((g) => g.id === id)?.rank ?? 1000;
  const defs = [...builtinItems(config, files, services), ...config.extensions.flatMap((e) => e.slash ?? [])];
  defs.sort((a, b) => rankOf(a.group) - rankOf(b.group) || (a.rank ?? 100) - (b.rank ?? 100));
  return defs.map((d) => {
    const label = text(d.label, `slash.items.${d.id}.label`) || d.id;
    const description = text(d.description, `slash.items.${d.id}.description`);
    return {
      id: d.id,
      group: d.group,
      label,
      description,
      icon: d.icon,
      keywords: `${d.id} ${label} ${description} ${d.keywords ?? ""}`.toLowerCase(),
      inline: !!d.inline,
      enabled: (editor) => d.enabled?.(editor) ?? true,
      run: (editor, range) => d.run(slashContext(editor, range, services)),
    };
  });
}

export function groupLabel(config: EditorConfig, id: string, text: (label: SlashItemDef["label"] | undefined, key?: string) => string): string {
  const def = [...BASE_GROUPS, ...config.extensions.flatMap((e) => e.slashGroups ?? [])].find((g) => g.id === id);
  return text(def?.label, `slash.groups.${id}`) || id;
}

/** items whose label matches come first, group by group, so "/columns" offers the columns before the table */
export function filterItems(items: SlashItem[], query: string): SlashItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  const hits = items.filter((i) => words.every((w) => i.keywords.includes(w)));
  const labelled = (i: SlashItem) => words.every((w) => i.label.toLowerCase().includes(w));
  const strong = new Set(hits.filter(labelled).map((i) => i.group));
  const first = new Map<string, number>();
  hits.forEach((i, n) => first.has(i.group) || first.set(i.group, n));
  const keyed = hits.map((item, n) => ({ item, group: (strong.has(item.group) ? 0 : hits.length) + first.get(item.group)!, label: labelled(item) ? 0 : 1, n }));
  keyed.sort((a, b) => a.group - b.group || a.label - b.label || a.n - b.n);
  return keyed.map((x) => x.item);
}
