export declare const EMBED_PROVIDERS: readonly ["youtube", "vimeo", "loom", "figma", "gist", "maps", "tweet", "codepen", "generic"];
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];
export interface EmbedTarget {
    provider: EmbedProvider;
    /** iframe address */
    src: string;
}
/** null for anything but an https address */
export declare function embedFor(raw: string): EmbedTarget | null;
/** null keeps the provider's own shape (16:9 video or the default height) */
export declare const EMBED_HEIGHTS: Record<EmbedProvider, number | null>;
export declare const EMBED_MIN_HEIGHT = 120;
export declare const EMBED_MAX_HEIGHT = 1600;
/** sandbox flags; a page of the host's own origin loses `allow-same-origin`, so it cannot reach the editor */
export declare function embedSandbox(src: string): string;
export declare function isHttpsUrl(raw: string): boolean;
/** a lone URL as typed or pasted; http is allowed for links and bookmarks */
export declare function loneUrl(text: string): string | null;
