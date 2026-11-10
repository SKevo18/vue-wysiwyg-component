export interface Debounced {
    schedule(): void;
    cancel(): void;
}
export declare function debounced(fn: () => void, delay: number, maxWait: number): Debounced;
