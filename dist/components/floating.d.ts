import { type Placement, type ReferenceElement } from "@floating-ui/dom";
export interface FloatOptions {
    placement: Placement;
    offset: number;
    padding: number;
    apply(x: number, y: number): void;
    room?(height: number): void;
}
export declare function floatNear(anchor: ReferenceElement, el: HTMLElement, o: FloatOptions): {
    update(): void;
    stop(): void;
};
/** the element that scrolls `el` vertically: an app's own scroll container, else the document */
export declare function scrollParent(el: Element | null): Element;
/**
 * A popup in <body> sits outside the app's scroll container, so the wheel over it would scroll nothing. When nothing
 * inside the popup can scroll by the wheel's delta, the page around `anchor` scrolls instead. Returns the unbinding.
 */
export declare function passWheel(panel: HTMLElement, anchor: () => Element | null): () => void;
