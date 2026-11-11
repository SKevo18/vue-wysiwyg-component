import { Node } from "@tiptap/core";
import type { EditorExtension } from "../types";
export declare function parseEmbedHeight(v: unknown): number | null;
/** attributes of an embed of `url`; `src` is always derived again, so a stored document cannot point the iframe elsewhere */
export declare function embedAttrs(url: string, stored?: {
    provider?: unknown;
    height?: unknown;
}): {
    url: string;
    src: string;
    provider: "youtube" | "vimeo" | "loom" | "figma" | "gist" | "maps" | "tweet" | "codepen" | "generic";
    height: number | null;
};
export declare const Embed: Node<any, any>;
export declare const embedExtension: EditorExtension;
