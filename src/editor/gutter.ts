// hiding waits 250ms and the strip between handle and block counts as hovering.
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

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
const LEAF = "input, textarea, select, button, img, svg, video, audio, iframe, canvas";

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

function blockAtPos(view: EditorView, inside: number): Hovered | null {
  if (inside < 0 || inside > view.state.doc.content.size) return null;
  const $pos = view.state.doc.resolve(inside);
  const pos = $pos.depth === 0 ? $pos.pos : $pos.before(1);
  if (pos < 0 || pos >= view.state.doc.content.size || !view.state.doc.nodeAt(pos)) return null;
  const dom = view.nodeDOM(pos);
  return dom instanceof HTMLElement && dom.parentNode === view.dom ? { pos, dom } : null;
}

function nodeAtSafe(view: EditorView, pos: number) {
  return pos >= 0 && pos < view.state.doc.content.size ? view.state.doc.nodeAt(pos) : null;
}

function blockAt(view: EditorView, target: EventTarget | null): Hovered | null {
  if (!(target instanceof Node)) return null;
  let el: Node | null = target;
  while (el && el.parentNode !== view.dom) el = el.parentNode;
  if (!(el instanceof HTMLElement)) return null;
  return blockAtPos(view, view.posAtDOM(el, 0));
}

function blockBeside(view: EditorView, y: number): Hovered | null {
  const edge = view.dom.getBoundingClientRect().left + 1;
  const hit = view.posAtCoords({ left: edge, top: y });
  const found = hit && blockAtPos(view, hit.inside >= 0 ? hit.inside : hit.pos);
  if (!found) return null;
  const rect = found.dom.getBoundingClientRect();
  return y >= rect.top && y <= rect.bottom ? found : null;
}

class GutterView {
  private el: HTMLElement;
  private grip: HTMLElement;
  private plus: HTMLButtonElement;
  private hovered: Hovered | null = null;
  private container: HTMLElement | null = null;
  private zone: HTMLElement | null = null;
  private frame = 0;
  private view: EditorView;
  private options: GutterHandleOptions;
  private hideTimer = 0;

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
    this.grip.addEventListener("dragend", this.onDragEnd);
    this.plus.addEventListener("mousedown", (e) => e.preventDefault());
    this.plus.addEventListener("click", this.onPlus);
    this.hide();
    this.bindLater();
  }

  private bindLater = () => {
    this.frame = 0;
    if (!this.bind()) this.frame = requestAnimationFrame(this.bindLater);
  };

  private bind(): boolean {
    const container = this.view.dom.parentElement;
    const zone = container?.parentElement;
    if (!container || !zone || !this.view.dom.isConnected) return false;
    if (zone === this.zone && container === this.container) return true;
    this.unbind();
    this.container = container;
    this.zone = zone;
    container.appendChild(this.el);
    zone.addEventListener("mousemove", this.onMove);
    zone.addEventListener("mouseleave", this.onLeave);
    return true;
  }

  private unbind() {
    this.zone?.removeEventListener("mousemove", this.onMove);
    this.zone?.removeEventListener("mouseleave", this.onLeave);
    this.zone = null;
  }

  update() {
    this.bind();
    if (this.hovered && !this.view.editable) this.hide();
    else if (this.hovered) {
      const node = nodeAtSafe(this.view, this.hovered.pos);
      if (!node || this.view.nodeDOM(this.hovered.pos) !== this.hovered.dom) this.hide();
      else this.place();
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.unbind();
    this.cancelHide();
    this.el.remove();
  }

  private onMove = (e: MouseEvent) => {
    if (!this.view.editable || this.view.dragging || this.options.menuOpen()) return;
    const target = e.target as Node;
    if (this.el.contains(target) || this.inStrip(e.clientX, e.clientY)) {
      this.cancelHide();
      return;
    }
    const dom = this.view.dom;
    let found: Hovered | null = null;
    if (dom.contains(target)) found = blockAt(this.view, target);
    else if (e.clientX < dom.getBoundingClientRect().left) found = blockBeside(this.view, e.clientY);
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

  private inStrip(x: number, y: number): boolean {
    if (!this.hovered) return false;
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
    const { dom } = this.hovered;
    const rect = dom.getBoundingClientRect();
    const base = container.getBoundingClientRect();
    const style = getComputedStyle(dom);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    this.el.style.display = "flex";
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    const line = firstLineRect(dom);
    const centre = line ? line.top + Math.min(line.height, lineHeight) / 2 : rect.top + (parseFloat(style.paddingTop) || 0) + lineHeight / 2;
    // a table's edge counts as a ring, keeping the grip clear of the row handles on its left border
    const ring = style.float !== "none" ? null : dom.classList.contains("tableWrapper") ? rect.left : frameEdge(dom);
    const left = ring === null ? rect.left - GAP - width : ring - FRAME_GAP - width;
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
    this.view.dispatch(this.view.state.tr.setSelection(selection));
    const slice = selection.content();
    const { dom: html, text } = this.view.serializeForClipboard(slice);
    e.dataTransfer.clearData();
    e.dataTransfer.setData("text/html", html.innerHTML);
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "copyMove";
    const rect = dom.getBoundingClientRect();
    e.dataTransfer.setDragImage(dom, Math.min(24, rect.width / 2), 12);
    this.view.dragging = { slice, move: true };
    this.el.style.display = "none";
  };

  // prosemirror clears `dragging` only on dragend of its own DOM; the grip lives outside it
  private onDragEnd = () => {
    window.setTimeout(() => {
      if (this.view.dragging) this.view.dragging = null;
    }, 50);
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
      new Plugin({
        key: new PluginKey("gutterHandle"),
        view: (view) => new GutterView(view, options),
      }),
    ];
  },
});
