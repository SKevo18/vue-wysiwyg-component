// the markdown dialect writes only these color tokens; `<name>_bg` is the background of the same hue
export const PALETTE = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export type PaletteName = (typeof PALETTE)[number];

const TINTS: Record<PaletteName, string> = {
  gray: "var(--vc-fg-muted)",
  brown: "#9f6b53",
  orange: "var(--vc-tint-orange)",
  yellow: "var(--vc-tint-amber)",
  green: "var(--vc-tint-green)",
  blue: "var(--vc-tint-blue)",
  purple: "var(--vc-tint-violet)",
  pink: "var(--vc-tint-pink)",
  red: "var(--vc-tint-red)",
};

export function isPaletteToken(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return (PALETTE as readonly string[]).includes(v.endsWith("_bg") ? v.slice(0, -3) : v);
}

/** `--vc-color-<name>` / `--vc-bg-<name>`, with a fallback mixed from the theme so it reads in light and dark themes */
export function paletteCss(token: string): string {
  if (!isPaletteToken(token)) return "";
  const bg = token.endsWith("_bg");
  const name = (bg ? token.slice(0, -3) : token) as PaletteName;
  return bg ? `var(--vc-bg-${name}, color-mix(in srgb, ${TINTS[name]} 14%, var(--vc-bg)))` : `var(--vc-color-${name}, ${TINTS[name]})`;
}

/** custom properties the callout css reads: `--wy-callout-bg` for a background token, `--wy-callout-fg` for a text token */
export function calloutStyle(token: unknown): string | undefined {
  if (!isPaletteToken(token)) return undefined;
  return token.endsWith("_bg") ? `--wy-callout-bg: ${paletteCss(token)}` : `--wy-callout-fg: ${paletteCss(token)}`;
}
