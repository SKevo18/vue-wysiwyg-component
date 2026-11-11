import type { EditorServices } from "../types";
/** the host's `openLink` first; otherwise internal pages open in this tab and outside links in a new one */
export declare function followLink(services: EditorServices, href: string, event: MouseEvent, sameTab: boolean): void;
/** `services.resolveLink`, shared by every block and chip of one address for a minute */
export declare function resolveOnce(services: EditorServices, href: string): Promise<{
    title: string;
    icon?: string;
} | null>;
