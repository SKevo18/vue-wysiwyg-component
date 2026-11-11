/** a fence info value on one line without `"` (the info syntax cannot quote it) or a backtick (it would end the fence) */
export declare function infoText(v: unknown): string;
/** an address in a fence info value: whitespace, quotes and backticks percent-encoded */
export declare function infoUrl(v: unknown): string;
export declare function stringAttr(name: string): {
    default: string;
    parseHTML: (dom: HTMLElement) => string;
    renderHTML: (a: Record<string, unknown>) => {
        [x: string]: string;
    };
};
