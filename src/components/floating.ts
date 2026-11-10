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
