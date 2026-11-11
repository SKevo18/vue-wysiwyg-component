// The palette the markdown dialect writes: text colours by name (`red`), background colours with `_bg` (`red_bg`).
// Rendering maps them to `--vc-color-<name>` and `--vc-bg-<name>` (tokens.css); html documents may carry any CSS colour.

export const PALETTE = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export type PaletteName = (typeof PALETTE)[number];

const NAMES: Record<string, true> = Object.fromEntries(PALETTE.map((n) => [n, true]));

export function isTextToken(v: unknown): v is PaletteName {
  return typeof v === "string" && NAMES[v] === true;
}

/** `yellow_bg` */
export function isBgToken(v: unknown): v is `${PaletteName}_bg` {
  return typeof v === "string" && v.endsWith("_bg") && NAMES[v.slice(0, -3)] === true;
}

export function isColorToken(v: unknown): boolean {
  return isTextToken(v) || isBgToken(v);
}

/** `red` → `var(--vc-color-red)`, `red_bg` → `var(--vc-bg-red)`; null for anything else */
export function tokenCss(token: unknown): string | null {
  if (isTextToken(token)) return `var(--vc-color-${token})`;
  if (isBgToken(token)) return `var(--vc-bg-${token.slice(0, -3)})`;
  return null;
}

/** a token read back from a rendered `var(--vc-…)` value, so pasted editor html keeps its colours */
export function tokenFromCss(value: string | null | undefined): string | null {
  const m = /^\s*var\(--vc-(color|bg)-([a-z]+)\)\s*$/.exec(value ?? "");
  if (!m || NAMES[m[2]!] !== true) return null;
  return m[1] === "bg" ? `${m[2]}_bg` : m[2]!;
}

/** inline style of a block colour: text tokens colour the text, background tokens fill the block */
export function blockColorStyle(token: unknown): string | null {
  const css = tokenCss(token);
  if (!css) return null;
  return isBgToken(token) ? `background-color: ${css}` : `color: ${css}`;
}
