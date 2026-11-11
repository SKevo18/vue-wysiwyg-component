export declare const PLANTUML_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
/** plantuml's text encoding: raw deflate of the utf-8 source in its own base64 alphabet */
export declare function plantumlEncode(source: string): Promise<string>;
export declare function plantumlUrl(server: string, source: string): Promise<string>;
/** dark when the editor's `--vc-bg` (or the page background) is dark */
export declare function isDarkTheme(el: Element | null): boolean;
/** calls `fn` when the host switches its theme (class, style or color scheme) */
export declare function watchTheme(fn: () => void): () => void;
/** renders one diagram at a time: mermaid keeps its configuration and scratch elements global */
export declare function renderMermaid(source: string, dark: boolean): Promise<string>;
