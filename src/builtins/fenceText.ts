/** a fence info value on one line without `"` (the info syntax cannot quote it) or a backtick (it would end the fence) */
export function infoText(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .replace(/["`]/g, "'")
    .trim();
}

/** an address in a fence info value: whitespace, quotes and backticks percent-encoded */
export function infoUrl(v: unknown): string {
  return String(v ?? "")
    .trim()
    .replace(/[\s"`]/g, (c) => encodeURIComponent(c));
}

export function stringAttr(name: string) {
  return {
    default: "",
    parseHTML: (dom: HTMLElement) => dom.getAttribute(`data-${name}`) ?? "",
    renderHTML: (a: Record<string, unknown>) => (a[name] ? { [`data-${name}`]: String(a[name]) } : {}),
  };
}
