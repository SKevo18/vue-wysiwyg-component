import { Extension, type Editor } from "@tiptap/core";
import { VueRenderer } from "@tiptap/vue-3";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import { floatNear, passWheel } from "../components/floating";
import type { EditorServices, SlashItem } from "../types";
import SlashMenu from "../components/SlashMenu.vue";
import { cellSlice, isInCell } from "./tables";
import { headingFor, scrollToHeading } from "./headings";

export const BLOCK_EDIT_EVENT = "wy-block-edit";

// a node view's chrome owns its events, except drags from `[data-drag-handle]` and drops, which prosemirror handles
export function blockStopEvent({ event }: { event: Event }): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const wrapper = target.closest("[data-node-view-wrapper]");
  const content = target.closest("[data-node-view-content], [data-node-view-content-vue]");
  if (content && wrapper && wrapper.contains(content)) return false;
  const type = event.type;
  if (type.startsWith("drag") || type === "drop") {
    if (type === "dragstart" && !target.closest("[data-drag-handle]")) {
      event.preventDefault();
      return true;
    }
    return false;
  }
  if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(target.tagName) || (target instanceof HTMLElement && target.isContentEditable)) return true;
  if (type === "copy" || type === "paste" || type === "cut") return false;
  if (type === "mousedown" || type === "mouseup" || type === "click" || type === "dblclick") return !target.closest("[data-drag-handle]");
  return true;
}

/** script and data urls become "" */
export function normalizeHref(raw: string): string {
  const v = raw.trim();
  // browsers ignore control characters and whitespace inside the scheme
  if (/^(javascript|vbscript|data):/i.test(v.replace(/[\u0000-\u0020]/g, ""))) return "";
  if (!v || /^([a-z][a-z0-9+.-]*:|\/|#|\?|\.)/i.test(v)) return v;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{6,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, "")}`;
  return `https://${v}`;
}

export function linkAtSelection(editor: Editor): { href: string; text: string; hasLink: boolean } {
  const { from, to } = editor.state.selection;
  const href = String(editor.getAttributes("link").href ?? "");
  if (href) editor.chain().focus().extendMarkRange("link").run();
  const sel = editor.state.selection;
  const text = editor.state.doc.textBetween(href ? sel.from : from, href ? sel.to : to, " ");
  return { href, text, hasLink: !!href };
}

export function applyLink(editor: Editor, rawHref: string, text: string) {
  const href = normalizeHref(rawHref);
  if (!href) {
    removeLink(editor);
    return;
  }
  const { from, to, empty } = editor.state.selection;
  const label = text || rawHref.trim();
  if (empty || (text && text !== editor.state.doc.textBetween(from, to, " "))) {
    editor.chain().focus().insertContentAt({ from, to }, { type: "text", text: label, marks: [{ type: "link", attrs: { href } }] }).run();
  } else {
    editor.chain().focus().setLink({ href }).run();
  }
}

export function removeLink(editor: Editor) {
  editor.chain().focus().extendMarkRange("link").unsetLink().run();
}

/** the host's `openLink` first (it returns true for routes it handles), otherwise a new tab without an opener */
export function openHref(services: EditorServices, raw: string, event: MouseEvent) {
  const href = normalizeHref(raw);
  if (!href || services.openLink?.(href, event) === true) return;
  window.open(href, "_blank", "noopener,noreferrer");
}

const DRAG_PX = 4;

/**
 * A plain click on a link opens it in editable and readonly editors; dragging, shift and multi clicks select text. A
 * link to a heading of this document (`#Heading`) scrolls to it. Blocks that follow their own links (a bookmark, a page
 * link, the table of contents) prevent the click's default, so the editor leaves it alone.
 */
export const LinkClicks = Extension.create<{ open(href: string, event: MouseEvent): void }>({
  name: "linkClicks",
  addOptions() {
    return { open: () => {} };
  },
  addProseMirrorPlugins() {
    const open = this.options.open;
    let down: { x: number; y: number } | null = null;
    return [
      new Plugin({
        key: new PluginKey("linkClicks"),
        props: {
          handleDOMEvents: {
            mousedown(_view, event) {
              down = { x: event.clientX, y: event.clientY };
              return false;
            },
            click(view, event) {
              const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
              // links of a nested editor (a caption field) belong to that editor
              if (!link || event.button !== 0 || event.defaultPrevented || link.closest(".ProseMirror") !== view.dom) return false;
              event.preventDefault();
              const moved = !!down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_PX;
              const selecting = window.getSelection()?.isCollapsed === false;
              if (moved || selecting || event.shiftKey || event.detail > 1) return false;
              const href = link.getAttribute("href") ?? "";
              if (href.startsWith("#")) {
                const heading = headingFor(view.state.doc, href);
                if (heading) scrollToHeading(view, heading.pos);
                return true;
              }
              open(href, event);
              return true;
            },
          },
        },
      }),
    ];
  },
});

export const SLASH_KEY = new PluginKey("wysiwygSlash");

interface SlashOptions {
  items(query: string): SlashItem[];
  groupLabel(id: string): string;
  t(key: string): string;
}

export const SlashCommand = Extension.create<SlashOptions>({
  name: "slashCommand",
  addOptions() {
    return { items: () => [], groupLabel: (id) => id, t: (k) => k };
  },
  addProseMirrorPlugins() {
    const options = this.options;
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        pluginKey: SLASH_KEY,
        // "/link to page" keeps the menu open; a query with a space only continues an open menu, and closes once nothing matches or on a double space
        allowSpaces: true,
        startOfLine: false,
        allow: ({ editor, state, range, isActive }) => {
          if (state.doc.resolve(range.from).parent.type.spec.code) return false;
          const query = state.doc.textBetween(range.from + 1, range.to, "\n", "\n");
          if (!/\s/.test(query)) return true;
          if (!isActive || /^\s|\s\s/.test(query)) return false;
          return options.items(query).some((i) => i.enabled(editor));
        },
        items: ({ query, editor }) => options.items(query).filter((i) => i.enabled(editor)),
        command: ({ editor, range, props }) => {
          if (props.inline || !isInCell(editor.state.selection.$from)) props.run(editor, range);
        },
        render: () => {
          let renderer: VueRenderer | null = null;
          let el: HTMLElement | null = null;
          let floating: { update(): void; stop(): void } | null = null;
          let rect: (() => DOMRect | null) | null = null;
          let unwheel = () => {};
          const close = () => {
            unwheel();
            floating?.stop();
            renderer?.destroy();
            el?.remove();
            renderer = null;
            el = null;
            floating = null;
          };
          const reference = { getBoundingClientRect: () => rect?.() ?? new DOMRect() };
          const props = (p: SuggestionProps<SlashItem>) => ({ items: p.items, command: p.command, inCell: isInCell(p.editor.state.selection.$from), groupLabel: options.groupLabel, t: options.t });
          return {
            onStart(p) {
              rect = p.clientRect ?? null;
              renderer = new VueRenderer(SlashMenu, { props: props(p), editor: p.editor });
              const menu = (el = renderer.element as HTMLElement);
              menu.style.position = "fixed";
              menu.style.zIndex = "1000";
              document.body.appendChild(menu);
              unwheel = passWheel(menu, () => p.editor.view.dom);
              floating = floatNear(reference, menu, {
                placement: "bottom-start",
                offset: 6,
                padding: 8,
                apply: (x, y) => {
                  menu.style.left = `${x}px`;
                  menu.style.top = `${y}px`;
                },
                room: (h) => menu.style.setProperty("--wy-menu-room", `${Math.max(160, h)}px`),
              });
            },
            onUpdate(p) {
              rect = p.clientRect ?? null;
              renderer?.updateProps(props(p));
              floating?.update();
            },
            onKeyDown(p) {
              if (p.event.key === "Escape") {
                // the dialog around an expanded field must not take this Esc as well
                p.event.stopPropagation();
                close();
                return true;
              }
              return (renderer?.ref as { onKeyDown?: (e: KeyboardEvent) => boolean } | null)?.onKeyDown?.(p.event) ?? false;
            },
            onExit: close,
          };
        },
      }),
    ];
  },
});

export const BlockKeys = Extension.create({
  name: "blockKeys",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockKeys"),
        props: {
          handleKeyDown(view, event) {
            const sel = view.state.selection;
            if (event.key !== "Enter" || !(sel instanceof NodeSelection) || sel.node.isTextblock) return false;
            const dom = view.nodeDOM(sel.from);
            if (!(dom instanceof HTMLElement) || !dom.hasAttribute("data-node-view-wrapper")) return false;
            dom.dispatchEvent(new CustomEvent(BLOCK_EDIT_EVENT));
            return true;
          },
        },
      }),
    ];
  },
});

export const InlineKeys = Extension.create({
  name: "inlineKeys",
  addKeyboardShortcuts() {
    return { Enter: () => true, "Shift-Enter": () => true };
  },
});

/** Mod-a in a code block or table cell selects that block's text first; the next Mod-a selects the document */
export const ScopedSelectAll = Extension.create({
  name: "scopedSelectAll",
  // ahead of the core keymap's select all
  priority: 101,
  addKeyboardShortcuts() {
    return {
      "Mod-a": ({ editor }) => {
        const { state } = editor;
        const { $from, to, from } = state.selection;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          const role = node.type.spec.tableRole;
          if (!node.type.spec.code && role !== "cell" && role !== "header_cell") continue;
          if (to > $from.end(d)) return false;
          const inner = TextSelection.between(state.doc.resolve($from.start(d)), state.doc.resolve($from.end(d)));
          if (inner.from === from && inner.to === to) return false;
          editor.view.dispatch(state.tr.setSelection(inner));
          return true;
        }
        return false;
      },
    };
  },
});

// editor ui outside the content that acts on the selected block
const SELECTION_UI = ".wy-gutter, .wy-floating, .wy-menu, .wy-toolbar, .wy-field-tools, .wy-bubble, .wy-modal-backdrop, [role=dialog], [data-block-portal]";

/**
 * A mousedown anywhere but the selected block (outside the editor, in another block's own controls such as an embedded
 * database or a form field) drops a block selection, so no block stays highlighted once the user works elsewhere.
 */
export const ClickAway = Extension.create({
  name: "clickAway",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("clickAway"),
        view(view) {
          const onDown = (e: MouseEvent) => {
            const sel = view.state.selection;
            const target = e.target;
            if (!(sel instanceof NodeSelection) || !(target instanceof Element)) return;
            const own = view.nodeDOM(sel.from);
            if (own instanceof Node && own.contains(target)) return;
            if (!view.dom.contains(target) && target.closest(SELECTION_UI)) return;
            const $pos = view.state.doc.resolve(sel.from);
            const text = Selection.findFrom($pos, -1, true) ?? Selection.findFrom($pos, 1, true);
            if (text) view.dispatch(view.state.tr.setSelection(text).setMeta("addToHistory", false));
          };
          document.addEventListener("mousedown", onDown, true);
          return { destroy: () => document.removeEventListener("mousedown", onDown, true) };
        },
      }),
    ];
  },
});

/** a click right of an inline atom that ends its line puts the caret after it (firefox puts it before) */
export const InlineAtomClick = Extension.create({
  name: "inlineAtomClick",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            const $pos = view.state.doc.resolve(pos);
            const rightOf = (at: number): boolean => {
              const dom = view.nodeDOM(at);
              if (!(dom instanceof HTMLElement)) return false;
              const r = dom.getBoundingClientRect();
              return event.clientX > r.right && event.clientY >= r.top && event.clientY <= r.bottom;
            };
            let target: number | null = null;
            const after = $pos.nodeAfter;
            const before = $pos.nodeBefore;
            if (after?.isInline && after.isAtom && rightOf(pos)) target = pos + after.nodeSize;
            else if (before?.isInline && before.isAtom && $pos.parentOffset === $pos.parent.content.size && rightOf(pos - before.nodeSize)) target = pos;
            if (target === null) return false;
            view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, target)));
            return true;
          },
        },
      }),
    ];
  },
});

export const TableCells = Extension.create({
  name: "tableCells",
  // ahead of the core keymap, whose Enter would split the cell; an open slash menu keeps its Enter
  priority: 101,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const sel = editor.state.selection;
        return sel instanceof TextSelection && isInCell(sel.$from) && !SLASH_KEY.getState(editor.state)?.active && editor.commands.setHardBreak();
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableCells"),
        props: { transformPasted: (slice, view) => (isInCell(view.state.selection.$from) ? cellSlice(slice, view.state) : slice) },
      }),
    ];
  },
});

export const HostKeys = Extension.create<{ keys: () => Record<string, () => boolean> }>({
  name: "hostKeys",
  priority: 1000,
  addOptions() {
    return { keys: () => ({}) };
  },
  addKeyboardShortcuts() {
    const out: Record<string, () => boolean> = {};
    for (const [key, fn] of Object.entries(this.options.keys())) out[key] = fn;
    return out;
  },
});
