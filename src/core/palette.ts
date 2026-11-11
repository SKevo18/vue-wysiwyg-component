// block colors of the notion blocks, on top of the shared palette tokens in ./colors
import { PALETTE, isBgToken, isColorToken, tokenCss } from "./colors";

export { PALETTE };

export function isPaletteToken(v: unknown): v is string {
  return isColorToken(v);
}

export function paletteCss(token: string): string {
  return tokenCss(token) ?? "";
}

/** custom properties the callout css reads: `--wy-callout-bg` for a background token, `--wy-callout-fg` for a text token */
export function calloutStyle(token: unknown): string | undefined {
  const css = tokenCss(token);
  if (!css) return undefined;
  return isBgToken(token) ? `--wy-callout-bg: ${css}` : `--wy-callout-fg: ${css}`;
}
