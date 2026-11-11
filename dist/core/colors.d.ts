export declare const PALETTE: readonly ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
export type PaletteName = (typeof PALETTE)[number];
export declare function isTextToken(v: unknown): v is PaletteName;
/** `yellow_bg` */
export declare function isBgToken(v: unknown): v is `${PaletteName}_bg`;
export declare function isColorToken(v: unknown): boolean;
/** `red` → `var(--vc-color-red)`, `red_bg` → `var(--vc-bg-red)`; null for anything else */
export declare function tokenCss(token: unknown): string | null;
/** a token read back from a rendered `var(--vc-…)` value, so pasted editor html keeps its colours */
export declare function tokenFromCss(value: string | null | undefined): string | null;
/** inline style of a block colour: text tokens colour the text, background tokens fill the block */
export declare function blockColorStyle(token: unknown): string | null;
