/** whether a code block with this fence info `meta` (the info after the language) wraps its lines */
export declare function codeWraps(meta: string): boolean;
/** the fence info `meta` with the wrap flag set: `nowrap` leads the other words, which stay as they were */
export declare function setCodeWrap(meta: string, wrap: boolean): string;
