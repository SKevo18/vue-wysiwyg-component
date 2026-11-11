import { autoUpdate, computePosition, flip, offset, shift, size, type Placement, type ReferenceElement } from "@floating-ui/dom";

export interface FloatOptions {
  placement: Placement;
  offset: number;
  padding: number;
  apply(x: number, y: number): void;
  room?(height: number): void;
}

export function floatNear(anchor: ReferenceElement, el: HTMLElement, o: FloatOptions): { update(): void; stop(): void } {
  const padding = o.padding;
  const room = o.room;
  const middleware = [offset(o.offset), flip({ padding }), shift({ padding }), ...(room ? [size({ padding, apply: ({ availableHeight }) => room(availableHeight) })] : [])];
  const update = () => void computePosition(anchor, el, { strategy: "fixed", placement: o.placement, middleware }).then(({ x, y }) => o.apply(x, y));
  return { update, stop: autoUpdate(anchor, el, update) };
}

function scrollsY(el: Element): boolean {
  const s = getComputedStyle(el);
  return /(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight;
}

function scrollsX(el: Element): boolean {
  const s = getComputedStyle(el);
  return /(auto|scroll|overlay)/.test(s.overflowX) && el.scrollWidth > el.clientWidth;
}

/** whether `el` can still scroll by this wheel delta */
function canScroll(el: Element, dx: number, dy: number): boolean {
  if (dy && scrollsY(el)) return dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  if (dx && scrollsX(el)) return dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  return false;
}

/** the element that scrolls `el` vertically: an app's own scroll container, else the document */
export function scrollParent(el: Element | null): Element {
  for (let p = el?.parentElement ?? null; p && p !== document.body; p = p.parentElement) if (scrollsY(p)) return p;
  return document.scrollingElement ?? document.documentElement;
}

/**
 * A popup in <body> sits outside the app's scroll container, so the wheel over it would scroll nothing. When nothing
 * inside the popup can scroll by the wheel's delta, the page around `anchor` scrolls instead. Returns the unbinding.
 */
export function passWheel(panel: HTMLElement, anchor: () => Element | null): () => void {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    for (let el = e.target instanceof Element ? e.target : null; el; el = el === panel ? null : el.parentElement) if (canScroll(el, e.deltaX, e.deltaY)) return;
    const page = scrollParent(anchor());
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? page.clientHeight : 1;
    e.preventDefault();
    page.scrollBy({ left: e.deltaX * unit, top: e.deltaY * unit });
  };
  panel.addEventListener("wheel", onWheel, { passive: false });
  return () => panel.removeEventListener("wheel", onWheel);
}
