// Block drags from the gutter grip belong to the editor from dragstart to drop. Capture listeners on the document see
// every dragover and drop, also over the handle column, the page margins and node views that swallow events. They show
// a guide at the nearest block boundary and move the block there in one transaction. The browser's own drop never runs,
// so a dragged block is never pasted as text (into a code block) and never leaves a copy behind.
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** marks a block drag in `dataTransfer.types` */
export const BLOCK_DRAG_TYPE = "application/x-wysiwyg-block";

/** a boundary between blocks: `pos` in the document and the guide line in viewport coordinates */
export interface DropSpot {
  pos: number;
  left: number;
  right: number;
  y: number;
}

interface Child {
  pos: number;
  index: number;
  node: PMNode;
  rect: DOMRect;
}

// the drop region reaches this far above and below the content
const REGION_SLACK = 48;

function children(view: EditorView, parent: PMNode, start: number): Child[] {
  const out: Child[] = [];
  parent.forEach((node, offset, index) => {
    const dom = view.nodeDOM(start + offset);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();
    // collapsed or hidden content has no boundary of its own
    if (rect.width || rect.height) out.push({ pos: start + offset, index, node, rect });
  });
  return out;
}

/**
 * The boundary a block dropped at `x`/`y` lands on: the deepest container under the pointer that accepts the node, so
 * a block can go into a column, a callout, a toggle or a list item. Left of the content only the top level counts,
 * unless the node does not fit there (a list item stays in a list).
 */
export function dropSpot(view: EditorView, x: number, y: number, node: PMNode, from: number): DropSpot | null {
  const box = view.dom.getBoundingClientRect();
  const over = x >= box.left && x <= box.right;
  const end = from + node.nodeSize;
  let parent: PMNode = view.state.doc;
  let start = 0;
  let best: DropSpot | null = null;
  for (;;) {
    const kids = children(view, parent, start);
    if (!kids.length) break;
    let i = kids.findIndex((k) => y < k.rect.top + k.rect.height / 2);
    if (i < 0) i = kids.length;
    const last = kids[kids.length - 1]!;
    // the padding above and below a container's children drops next to the container
    if (parent !== view.state.doc && (y < kids[0]!.rect.top || y > last.rect.bottom)) break;
    let pos = i < kids.length ? kids[i]!.pos : last.pos + last.node.nodeSize;
    const index = i < kids.length ? kids[i]!.index : last.index + 1;
    // a list item's first child is the item's own text; a block dropped before it would take over the bullet
    const ownText = index === 0 && /item$/i.test(parent.type.name);
    let valid = parent.canReplaceWith(index, index, node.type, node.marks) && !ownText;
    // a paragraph between two list items cannot stand in the list, so it goes to the end of the item above
    const prev = i > 0 ? kids[i - 1]!.node : null;
    if (!valid && prev && !prev.isTextblock && !prev.isAtom && prev.canReplaceWith(prev.childCount, prev.childCount, node.type, node.marks)) {
      pos = kids[i - 1]!.pos + prev.nodeSize - 1;
      valid = true;
    }
    if (valid && !(pos > from && pos < end)) {
      const top = parent === view.state.doc;
      best = {
        pos,
        left: top ? box.left : Math.min(...kids.map((k) => k.rect.left)),
        right: top ? box.right : Math.max(...kids.map((k) => k.rect.right)),
        y: i === 0 ? kids[0]!.rect.top - 2 : i === kids.length ? last.rect.bottom + 2 : (kids[i - 1]!.rect.bottom + kids[i]!.rect.top) / 2,
      };
    }
    const row = kids.filter((k) => y >= k.rect.top && y <= k.rect.bottom);
    let hit = row.find((k) => x >= k.rect.left && x <= k.rect.right) ?? null;
    if (hit && !over && best) hit = null;
    if (!hit && !best && row.length) hit = row.reduce((a, b) => (Math.abs(x - (a.rect.left + a.rect.right) / 2) <= Math.abs(x - (b.rect.left + b.rect.right) / 2) ? a : b));
    if (!hit || hit.pos === from) break;
    const inner = hit.node;
    if (inner.isAtom || inner.isTextblock || inner.type.spec.code || inner.type.spec.tableRole !== undefined) break;
    parent = hit.node;
    start = hit.pos + 1;
  }
  return best;
}

/** moves the block at `from` to the boundary `to` in one transaction; null when that would change nothing */
export function moveBlock(state: EditorState, from: number, to: number): Transaction | null {
  const node = state.doc.nodeAt(from);
  if (!node) return null;
  const end = from + node.nodeSize;
  if (to >= from && to <= end) return null;
  const tr = state.tr.insert(to, node);
  const a = tr.mapping.map(from);
  const b = tr.mapping.map(end);
  const $a = tr.doc.resolve(a);
  const index = $a.index();
  const paragraph = state.schema.nodes.paragraph;
  if ($a.parent.canReplace(index, index + 1)) tr.delete(a, b);
  // a column or callout keeps an empty line rather than becoming invalid
  else if (paragraph && $a.parent.canReplaceWith(index, index + 1, paragraph)) tr.replaceWith(a, b, paragraph.create());
  else tr.deleteRange(a, b);
  const at = tr.mapping.slice(1).map(to);
  const moved = tr.doc.nodeAt(at);
  if (moved?.isTextblock) tr.setSelection(TextSelection.create(tr.doc, at + moved.nodeSize - 1));
  else if (moved && NodeSelection.isSelectable(moved)) tr.setSelection(NodeSelection.create(tr.doc, at));
  else tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))));
  return tr.setMeta("uiEvent", "drop");
}

function scrollBox(el: HTMLElement): { left: number; right: number; top: number; bottom: number } {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(`${s.overflowY} ${s.overflowX}`)) return p.getBoundingClientRect();
  }
  return { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
}

let active: BlockDrag | null = null;
let guards = 0;

// a drop of a block drag that already ended (another editor, a late event) is dropped, never pasted
function staleDrop(e: DragEvent) {
  if (active || !e.dataTransfer?.types.includes(BLOCK_DRAG_TYPE)) return;
  e.preventDefault();
  e.stopPropagation();
}

export interface BlockDragSource {
  /** the dragged block's current position, kept up to date through document changes; null when it is gone */
  pos(): number | null;
}

export class BlockDrag {
  private guide: HTMLElement;
  private source: BlockDragSource | null = null;
  private view: EditorView;
  private container: () => HTMLElement | null;
  private onStop: () => void;

  constructor(view: EditorView, container: () => HTMLElement | null, onStop: () => void) {
    this.view = view;
    this.container = container;
    this.onStop = onStop;
    this.guide = document.createElement("div");
    this.guide.className = "wy-drop-guide";
    this.guide.setAttribute("aria-hidden", "true");
    if (!guards++) document.addEventListener("drop", staleDrop, true);
  }

  get dragging(): boolean {
    return this.source !== null;
  }

  start(source: BlockDragSource) {
    active?.stop();
    active = this;
    this.source = source;
    document.addEventListener("dragenter", this.onOver, true);
    document.addEventListener("dragover", this.onOver, true);
    document.addEventListener("dragleave", this.onLeave, true);
    document.addEventListener("drop", this.onDrop, true);
    document.addEventListener("dragend", this.onEnd, true);
    // iframes (embeds) would take the dragover events for their own document
    document.documentElement.classList.add("wy-block-dragging");
  }

  stop() {
    if (!this.source) return;
    this.source = null;
    if (active === this) active = null;
    document.removeEventListener("dragenter", this.onOver, true);
    document.removeEventListener("dragover", this.onOver, true);
    document.removeEventListener("dragleave", this.onLeave, true);
    document.removeEventListener("drop", this.onDrop, true);
    document.removeEventListener("dragend", this.onEnd, true);
    document.documentElement.classList.remove("wy-block-dragging");
    this.guide.remove();
    this.onStop();
  }

  destroy() {
    this.stop();
    if (!--guards) document.removeEventListener("drop", staleDrop, true);
  }

  /** the boundary under the pointer, null outside the editor column */
  spotAt(x: number, y: number): DropSpot | null {
    const pos = this.source?.pos();
    const node = pos == null ? null : this.view.state.doc.nodeAt(pos);
    if (pos == null || !node) return null;
    const content = this.view.dom.getBoundingClientRect();
    const area = scrollBox(this.view.dom);
    if (x < area.left || x > area.right || y < Math.max(area.top, content.top - REGION_SLACK) || y > Math.min(area.bottom, content.bottom + REGION_SLACK)) return null;
    return dropSpot(this.view, x, y, node, pos);
  }

  private show(spot: DropSpot | null) {
    const container = this.container();
    if (!spot || !container) {
      this.guide.remove();
      return;
    }
    const base = container.getBoundingClientRect();
    if (this.guide.parentElement !== container) container.appendChild(this.guide);
    this.guide.style.left = `${spot.left - base.left}px`;
    this.guide.style.width = `${Math.max(0, spot.right - spot.left)}px`;
    this.guide.style.top = `${spot.y - base.top + container.scrollTop}px`;
  }

  private onOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const spot = this.spotAt(e.clientX, e.clientY);
    if (e.dataTransfer) e.dataTransfer.dropEffect = spot ? "move" : "none";
    this.show(spot);
  };

  private onLeave = (e: DragEvent) => {
    e.stopPropagation();
    if (!e.relatedTarget) this.show(null);
  };

  private onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const spot = this.spotAt(e.clientX, e.clientY);
    const pos = this.source?.pos();
    this.stop();
    if (!spot || pos == null) return;
    const tr = moveBlock(this.view.state, pos, spot.pos);
    if (!tr) return;
    this.view.dispatch(tr);
    this.view.focus();
  };

  private onEnd = () => this.stop();
}
