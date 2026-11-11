export declare const PALETTE: readonly ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
export type PaletteName = (typeof PALETTE)[number];
export declare function isPaletteToken(v: unknown): v is string;
/** `--vc-color-<name>` / `--vc-bg-<name>`, with a fallback mixed from the theme so it reads in light and dark themes */
export declare function paletteCss(token: string): string;
/** custom properties the callout css reads: `--wy-callout-bg` for a background token, `--wy-callout-fg` for a text token */
export declare function calloutStyle(token: unknown): string | undefined;
