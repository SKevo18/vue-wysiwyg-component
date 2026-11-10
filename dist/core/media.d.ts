export declare const FIGURE_ALIGNS: readonly ["left", "center", "right", "float-left", "float-right"];
export type FigureAlign = (typeof FIGURE_ALIGNS)[number];
export interface ImageAttrs {
    /** percent of the column, 10..100; null = natural width capped at the column */
    width: number | null;
    align: FigureAlign | null;
}
export declare function parseImageAttrs(body: string): ImageAttrs | null;
export declare function formatImageAttrs(attrs: Partial<ImageAttrs>): string;
export declare function shownAlign(align: FigureAlign | null, caption: string | null | undefined): FigureAlign;
type MediaKind = "video" | "audio";
export declare function mediaKind(src: string): MediaKind | null;
export declare function isImageSrc(src: string): boolean;
export declare const SIZE_RE: RegExp;
export declare function formatBytes(bytes: number, locale?: string): string;
export {};
