import { type MaybeRef, type Ref } from "vue";
export interface DraftRecord {
    content: string;
    title?: string;
    summary?: string;
    baseRevision?: string | number | null;
    /** iso string or epoch ms */
    updatedAt?: string | number | null;
    cursor?: number;
    canUndo?: boolean;
    canRedo?: boolean;
}
export interface DraftCursor {
    cursor: number;
    canUndo: boolean;
    canRedo: boolean;
}
export interface DraftStep extends DraftCursor {
    content: string;
}
export interface DraftAdapter {
    load(scope: string): Promise<DraftRecord | null>;
    save(scope: string, draft: {
        content: string;
        title?: string;
        summary?: string;
        baseRevision?: string | number | null;
    }): Promise<DraftCursor | void>;
    remove(scope: string): Promise<void>;
    undo?(scope: string): Promise<DraftStep | null>;
    redo?(scope: string): Promise<DraftStep | null>;
    /** true when an error means the network is down (status `offline`) rather than a refused save (`error`) */
    isOffline?(error: unknown): boolean;
}
export type DraftStatus = "none" | "idle" | "saving" | "saved" | "offline" | "error";
export interface DraftOptions {
    scope: MaybeRef<string | null>;
    content: Ref<string>;
    title?: Ref<string>;
    summary?: Ref<string>;
    baseRevision?: Ref<string | number | null>;
    /** ms, default 500 */
    delay?: number;
    newerThan?: MaybeRef<string | number | Date | null | undefined>;
    /** whether a loaded draft that differs from the content replaces it; default: when it is newer */
    onRestore?: (draft: DraftRecord) => boolean | Promise<boolean>;
}
export interface DraftHandle {
    status: Readonly<Ref<DraftStatus>>;
    canUndo: Readonly<Ref<boolean>>;
    canRedo: Readonly<Ref<boolean>>;
    restored: Ref<boolean>;
    flush(): Promise<void>;
    undo(): Promise<string | null>;
    redo(): Promise<string | null>;
    historyStep(content: string): Promise<void>;
    discard(): Promise<void>;
    load(): Promise<DraftRecord | null>;
    reset(content: string): void;
    attach(flush: () => void): () => void;
    pending(on: boolean): void;
}
export declare function useDraft(adapter: DraftAdapter, opts: DraftOptions): DraftHandle;
