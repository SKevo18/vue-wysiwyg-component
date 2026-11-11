import { PALETTE } from "./colors";
export { PALETTE };
export declare function isPaletteToken(v: unknown): v is string;
export declare function paletteCss(token: string): string;
/** custom properties the callout css reads: `--wy-callout-bg` for a background token, `--wy-callout-fg` for a text token */
export declare function calloutStyle(token: unknown): string | undefined;
