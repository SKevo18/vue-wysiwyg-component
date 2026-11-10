import type { Directive } from "vue";
export type TooltipValue = string | {
    text: string;
    keys?: string;
} | null | undefined;
export declare function formatKeys(keys: string): string;
export declare const vTooltip: Directive<HTMLElement, TooltipValue>;
