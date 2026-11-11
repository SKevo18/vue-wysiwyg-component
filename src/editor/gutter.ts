// The block handle (+ and grip) left of the block under the pointer. It shows for the innermost block (a list item, a
// block in a column, callout or toggle) and, from the band left of the content, for the top-level block on that line,
// also when the host hangs the handles in its page margin. Hiding waits 250ms and the strip between handle and block
// counts as hovering. Grip drags are run by `BlockDrag`.
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { BLOCK_DRAG_TYPE, BlockDrag } from "./blockDrag";

interface GutterHandleOptions {
  onInsertAfter(pos: number): void;
  onMenu(pos: number, grip: HTMLElement): void;
  menuOpen(): boolean;
  labels(): { drag: string; add: string };
}

const GRIP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
const PLUS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';

interface Hovered {
  pos: number;
  dom: HTMLElement;
}

const GAP = 8;
const FRAME_GAP = 12;
const HIDE_DELAY = 250;
/** the band left of the content that shows the handle reaches this far beyond the handle itself */
const BAND = 24;
const LEAF = "input, textarea, select, button, img, svg, video, audio, iframe, canvas";
// floating editor ui over the band is not part of a block
const OVERLAY = "[role=dialog], [role=menu], [role=listbox], [role=toolbar], .wy-floating, .wy-slash";

/** the position of the dragged block, mapped through every change while a grip drag runs */
const dragKey = new PluginKey<number | null>("gutterDrag");

function firstLineRect(dom: HTMLElement): DOMRect | null {
  const walker = document.createTreeWalker(dom, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n instanceof Element) {
        if (n.matches(".wy-block-tools, .wy-block-menu, [data-block-portal]")) return NodeFilter.FILTER_REJECT;
        return n.matches(LEAF) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
      return n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    let rects: DOMRectList;
    if (n instanceof Element) rects = n.getClientRects();
    else {
      const range = document.createRange();
      range.selectNodeContents(n);
      rects = range.getClientRects();
    }
    if (rects.length && rects[0]!.height > 0) return rects[0]!;
  }
  return null;
}

function frameEdge(dom: HTMLElement): number | null {
  const frame = dom.classList.contains("wy-block-frame") ? dom : dom.querySelector<HTMLElement>(":scope > .wy-block-frame");
  if (!frame) return null;
  const body = frame.querySelector<HTMLElement>(":scope > .wy-block-body");
  const rect = body?.getBoundingClientRect();
  if (!body || !rect || rect.width === 0) return dom.getBoundingClientRect().left - 6;
  return rect.left - (parseFloat(getComputedStyle(body).outlineOffset) || 0);
}

function nodeAtSafe(view: EditorView, pos: number) {
  return pos >= 0 && pos < view.state.doc.content.size ? view.state.doc.nodeAt(pos) : null;
}

/**
 * The innermost block holding `target` that gets its own handle. A list item's first paragraph is the item's text and
 * a table's cells belong to the table, so those resolve to the item and the table.
 */
function blockAt(view: EditorView, target: Node): Hovered | null {
  const doc = view.state.doc;
  for (let el: Node | null = target; el && el !== view.dom; el = el.parentNode) {
    const parent = el.parentNode;
    if (!(el instanceof HTMLElement) || !parent) continue;
    let pos: number;
    try {
      pos = view.posAtDOM(parent, Array.prototype.indexOf.call(parent.childNodes, el));
    } catch {
      continue;
    }
    if (pos < 0 || pos >= doc.content.size || view.nodeDOM(pos) !== el) continue;
    const $pos = doc.resolve(pos);
    const node = $pos.nodeAfter;
    const holder = $pos.parent;
    if (!node?.isBlock || holder.isTextblock) continue;
    if ($pos.depth > 0) {
      if (holder.type.spec.tableRole !== undefined) continue;
      if ($pos.index() === 0 && /item$/i.test(holder.type.name)) continue;
      // a column (an isolating part of its container) moves with the container
      if (node.type.spec.isolating) continue;
    }
    return { pos, dom: el };
  }
  return null;
}

/** the top-level block on the line at `y`, for a pointer left of the content */
function blockBeside(view: EditorView, y: number): Hovered | null {
  const kids = view.dom.children;
  let lo = 0;
  let hi = kids.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = kids[mid]!.getBoundingClientRect();
    if (y < r.top) hi = mid - 1;
    else if (y > r.bottom) lo = mid + 1;
    else return blockAt(view, kids[mid]!);
  }
  return null;
}

class GutterView {
  private el: HTMLElement;
  private grip: HTMLElement;
  private plus: HTMLButtonElement;
  private hovered: Hovered | null = null;
  private container: HTMLElement | null = null;
  private frame = 0;
  private view: EditorView;
  private options: GutterHandleOptions;
  private hideTimer = 0;
  private drag: BlockDrag;

  constructor(view: EditorView, options: GutterHandleOptions) {
    this.view = view;
    this.options = options;
    const labels = options.labels();
    this.el = document.createElement("div");
    this.el.className = "wy-gutter";
    this.el.setAttribute("contenteditable", "false");
    this.grip = document.createElement("span");
    this.grip.className = "wy-grip";
    this.grip.draggable = true;
    this.grip.title = labels.drag;
    this.grip.setAttribute("role", "button");
    this.grip.setAttribute("aria-haspopup", "menu");
    this.grip.tabIndex = -1;
    this.grip.innerHTML = GRIP_ICON;
    this.plus = document.createElement("button");
    this.plus.type = "button";
    this.plus.className = "wy-grip";
    this.plus.title = labels.add;
    this.plus.setAttribute("aria-label", labels.add);
    this.plus.innerHTML = PLUS_ICON;
    this.el.append(this.plus, this.grip);
    this.el.addEventListener("mouseenter", this.cancelHide);
    this.grip.addEventListener("dragstart", this.onDragStart);
    this.grip.addEventListener("click", this.onGripClick);
    this.plus.addEventListener("mousedown", (e) => e.preventDefault());
    this.plus.addEventListener("click", this.onPlus);
    this.drag = new BlockDrag(view, () => this.container, this.onDragStop);
    this.hide();
    document.addEventListener("mousemove", this.onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", this.onLeave);
    this.bindLater();
  }

  private bindLater = () => {
    this.frame = 0;
    if (!this.bind()) this.frame = requestAnimationFrame(this.bindLater);
  };

  private bind(): boolean {
    const container = this.view.dom.parentElement;
    if (!container || !this.view.dom.isConnected) return false;
    if (container === this.container) return true;
    this.container = container;
    container.appendChild(this.el);
    return true;
  }

  update() {
    this.bind();
    if (this.drag.dragging) return;
    if (this.hovered && !this.view.editable) this.hide();
    else if (this.hovered) {
      const node = nodeAtSafe(this.view, this.hovered.pos);
      if (!node || this.view.nodeDOM(this.hovered.pos) !== this.hovered.dom) this.hide();
      else this.place();
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    document.removeEventListener("mousemove", this.onMove);
    document.documentElement.removeEventListener("mouseleave", this.onLeave);
    this.drag.destroy();
    this.cancelHide();
    this.el.remove();
  }

  private onMove = (e: MouseEvent) => {
    if (!this.view.editable || this.drag.dragging || this.options.menuOpen() || !this.container) return;
    const target = e.target as Node;
    if (this.el.contains(target) || this.inStrip(e.clientX, e.clientY)) {
      this.cancelHide();
      return;
    }
    const dom = this.view.dom;
    const box = dom.getBoundingClientRect();
    let found: Hovered | null = null;
    if (dom === target) {
      // between blocks: keep the handle of the block just left
      if (this.hovered) this.cancelHide();
      else this.scheduleHide();
      return;
    }
    if (dom.contains(target)) found = blockAt(this.view, target);
    else if (e.clientX < box.left && e.clientX >= box.left - this.band() && e.clientY >= box.top && e.clientY <= box.bottom && !(target instanceof Element && target.closest(OVERLAY))) {
      found = blockBeside(this.view, e.clientY);
    }
    if (!found) {
      this.scheduleHide();
      return;
    }
    this.cancelHide();
    if (this.hovered?.dom === found.dom && this.hovered.pos === found.pos) return;
    this.hovered = found;
    this.place();
  };

  private onLeave = () => this.scheduleHide();

  /** the handle's own width plus `BAND`, measured from the content edge */
  private band(): number {
    const shown = this.el.style.display !== "none";
    return (shown ? this.el.offsetWidth : 52) + GAP + FRAME_GAP + BAND;
  }

  private inStrip(x: number, y: number): boolean {
    if (!this.hovered || this.el.style.display === "none") return false;
    const h = this.el.getBoundingClientRect();
    const b = this.hovered.dom.getBoundingClientRect();
    return y >= h.top && y <= h.bottom && x >= h.left && x <= Math.max(h.right, b.left);
  }

  private scheduleHide() {
    if (!this.hovered || this.hideTimer || this.options.menuOpen()) return;
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = 0;
      this.hide();
    }, HIDE_DELAY);
  }

  private cancelHide = () => {
    if (!this.hideTimer) return;
    window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
  };

  private place() {
    const container = this.container;
    if (!this.hovered || !container) return;
    const { pos, dom } = this.hovered;
    const rect = dom.getBoundingClientRect();
    const base = container.getBoundingClientRect();
    const style = getComputedStyle(dom);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    this.el.style.display = "flex";
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    const line = firstLineRect(dom);
    const centre = line ? line.top + Math.min(line.height, lineHeight) / 2 : rect.top + (parseFloat(style.paddingTop) || 0) + lineHeight / 2;
    // a list item's marker sits left of the item, inside its list
    const list = /item$/i.test(this.view.state.doc.resolve(pos).nodeAfter?.type.name ?? "") ? dom.parentElement : null;
    // a table's edge counts as a ring, keeping the grip clear of the row handles on its left border
    const ring = style.float !== "none" ? null : dom.classList.contains("tableWrapper") ? rect.left : frameEdge(dom);
    const left = list ? list.getBoundingClientRect().left - GAP - width : ring === null ? rect.left - GAP - width : ring - FRAME_GAP - width;
    this.el.style.top = `${centre - height / 2 - base.top + container.scrollTop}px`;
    this.el.style.left = `${left - base.left}px`;
  }

  private hide() {
    this.cancelHide();
    this.hovered = null;
    this.el.style.display = "none";
  }

  private onGripClick = () => {
    if (!this.hovered) return;
    const { pos } = this.hovered;
    const node = nodeAtSafe(this.view, pos);
    if (!node) return;
    if (NodeSelection.isSelectable(node)) this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)));
    this.options.onMenu(pos, this.grip);
  };

  private onPlus = () => {
    if (!this.hovered) return;
    const node = nodeAtSafe(this.view, this.hovered.pos);
    if (!node) return;
    const after = this.hovered.pos + node.nodeSize;
    this.hide();
    this.options.onInsertAfter(after);
  };

  private onDragStart = (e: DragEvent) => {
    if (!this.hovered || !e.dataTransfer) return;
    const { pos, dom } = this.hovered;
    const node = nodeAtSafe(this.view, pos);
    if (!node) return;
    const selection = NodeSelection.create(this.view.state.doc, pos);
    this.view.dispatch(this.view.state.tr.setSelection(selection).setMeta(dragKey, pos));
    const { dom: html, text } = this.view.serializeForClipboard(selection.content());
    e.dataTransfer.clearData();
    e.dataTransfer.setData(BLOCK_DRAG_TYPE, "");
    e.dataTransfer.setData("text/html", html.innerHTML);
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "move";
    const rect = dom.getBoundingClientRect();
    e.dataTransfer.setDragImage(dom, Math.min(24, rect.width / 2), 12);
    this.drag.start({ pos: () => dragKey.getState(this.view.state) ?? null });
    // hiding the drag source inside dragstart makes chrome end the drag at once (dragend fires, the drag goes on)
    window.setTimeout(() => this.drag.dragging && this.el.classList.add("is-dragging"));
  };

  private onDragStop = () => {
    this.el.classList.remove("is-dragging");
    this.hide();
    if (dragKey.getState(this.view.state) != null && !this.view.isDestroyed) this.view.dispatch(this.view.state.tr.setMeta(dragKey, null));
  };
}

export const GutterHandle = Extension.create<GutterHandleOptions>({
  name: "gutterHandle",
  addOptions() {
    return { onInsertAfter: () => {}, onMenu: () => {}, menuOpen: () => false, labels: () => ({ drag: "", add: "" }) };
  },
  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<number | null>({
        key: dragKey,
        state: {
          init: () => null,
          apply(tr, pos) {
            const meta = tr.getMeta(dragKey) as number | null | undefined;
            if (meta !== undefined) return meta;
            if (pos == null || !tr.docChanged) return pos;
            const mapped = tr.mapping.mapResult(pos, 1);
            return mapped.deletedAfter ? null : mapped.pos;
          },
        },
        view: (view) => new GutterView(view, options),
      }),
    ];
  },
});
