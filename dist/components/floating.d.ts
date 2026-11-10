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
