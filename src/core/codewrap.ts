// Code blocks wrap long lines; the word `nowrap` in the fence info after the language keeps them on one line: ```js nowrap

const NOWRAP_RE = /(?:^|\s)nowrap(?=\s|$)/g;

/** whether a code block with this fence info `meta` (the info after the language) wraps its lines */
export function codeWraps(meta: string): boolean {
  return !meta.match(NOWRAP_RE);
}

/** the fence info `meta` with the wrap flag set: `nowrap` leads the other words, which stay as they were */
export function setCodeWrap(meta: string, wrap: boolean): string {
  const rest = meta.replace(NOWRAP_RE, "").trim();
  return wrap ? rest : rest ? `nowrap ${rest}` : "nowrap";
}
