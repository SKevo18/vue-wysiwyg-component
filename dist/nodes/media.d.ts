import type { FigureAlign } from "../core/media";
/** the content box of the column the media box sits in */
export declare function mediaColumn(node: HTMLElement): {
    left: number;
    width: number;
};
/** 10..100, rounded; NaN gives null */
export declare function clampWidth(n: number): number | null;
/** a right-aligned box grows to the left, a centred one to both sides */
export declare function rightAnchored(align: FigureAlign): boolean;
/** follows a pointer drag on the resize handle and reports the box width in percent of its column */
export declare function startMediaResize(e: PointerEvent, box: HTMLElement, align: FigureAlign, onWidth: (percent: number) => void): void;
