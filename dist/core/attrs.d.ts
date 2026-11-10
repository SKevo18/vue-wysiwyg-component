import type { MarkdownIt } from "markdown-it";
export declare const ORDERED_STYLES: readonly ["decimal", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"];
export declare const BULLET_STYLES: readonly ["disc", "circle", "square", "dash", "arrow"];
export type OrderedStyle = (typeof ORDERED_STYLES)[number];
export type BulletStyle = (typeof BULLET_STYLES)[number];
export type ListKind = "bullet" | "ordered";
export interface ListAttrs {
    style: OrderedStyle | BulletStyle | null;
    /** one or two characters, bullet lists only; wins over `style` */
    marker: string | null;
}
export declare const DIVIDER_WIDTHS: readonly [1, 2, 3, 4];
export declare const DIVIDER_STYLES: readonly ["solid", "dashed", "dotted", "double"];
export declare const DIVIDER_DESIGNS: readonly ["none", "star", "diamond", "dots", "fleuron"];
export declare const DIVIDER_COLORS: readonly ["red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
export type DividerStyle = (typeof DIVIDER_STYLES)[number];
export type DividerDesign = (typeof DIVIDER_DESIGNS)[number];
export interface DividerAttrs {
    /** px, 1..4 */
    width: number;
    /** palette name or `#rgb` / `#rrggbb`; null = the hairline colour */
    color: string | null;
    style: DividerStyle;
    design: DividerDesign;
    /** one or two characters; wins over `design` */
    char: string | null;
}
export declare const DEFAULT_DIVIDER: DividerAttrs;
export declare const DIVIDER_GLYPHS: Record<Exclude<DividerDesign, "none">, string>;
/** grapheme clusters, so an emoji counts as one; no `"` because the attribute syntax cannot quote it */
export declare function validChar(s: string): boolean;
export declare function parseAttrLine(line: string): Record<string, string> | null;
export declare function parseListAttrs(fields: Record<string, string>, kind: ListKind | null): ListAttrs | null;
export declare function formatListAttrs(attrs: Partial<ListAttrs>): string;
export declare function parseDividerAttrs(fields: Record<string, string>): DividerAttrs | null;
export declare function formatDividerAttrs(attrs: Partial<DividerAttrs>): string;
export declare function listLook(attrs: Partial<ListAttrs>): {
    class: string;
    style: string;
};
export declare function dividerOrnament(attrs: DividerAttrs): string;
export declare function dividerStyle(attrs: DividerAttrs): string;
export declare function blockAttrsPlugin(md: MarkdownIt): void;
