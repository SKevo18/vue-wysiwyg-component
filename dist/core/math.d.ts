export interface KatexLike {
    renderToString(tex: string, options?: Record<string, unknown>): string;
}
export type KatexLoader = () => Promise<KatexLike | {
    default: KatexLike;
}>;
export declare function setKatexLoader(load: KatexLoader | undefined): void;
export declare function renderMath(tex: string, display: boolean): string;
