// Resizing shared by figures and diagrams: the box is a percentage of its column, dragged from an edge handle.
import type { FigureAlign } from "../core/media";

/** the content box of the column the media box sits in */
export function mediaColumn(node: HTMLElement): { left: number; width: number } {
  const parent = node.parentElement!;
  const cs = getComputedStyle(parent);
  const left = parent.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
  return { left, width: parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
}

/** 10..100, rounded; NaN gives null */
export function clampWidth(n: number): number | null {
  return Number.isFinite(n) ? Math.min(100, Math.max(10, Math.round(n))) : null;
}

/** a right-aligned box grows to the left, a centred one to both sides */
export function rightAnchored(align: FigureAlign): boolean {
  return align === "right" || align === "float-right";
}

/** follows a pointer drag on the resize handle and reports the box width in percent of its column */
export function startMediaResize(e: PointerEvent, box: HTMLElement, align: FigureAlign, onWidth: (percent: number) => void) {
  const handle = e.currentTarget as HTMLElement;
  if (!box.parentElement) return;
  e.preventDefault();
  e.stopPropagation();
  const col = mediaColumn(box).width;
  const startX = e.clientX;
  const startW = box.getBoundingClientRect().width;
  const factor = align === "center" ? 2 : rightAnchored(align) ? -1 : 1;
  const move = (ev: PointerEvent) => {
    const w = clampWidth(((startW + (ev.clientX - startX) * factor) / col) * 100);
    if (w !== null) onWidth(w);
  };
  const stop = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", stop);
    handle.removeEventListener("pointercancel", stop);
  };
  handle.setPointerCapture(e.pointerId);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}
