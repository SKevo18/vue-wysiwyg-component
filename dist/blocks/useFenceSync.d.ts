import { type MaybeRefOrGetter } from "vue";
type Attrs = Record<string, string>;
export declare function useFenceSync(source: MaybeRefOrGetter<{
    attrs: Attrs;
    body: string;
}>, emit: (attrs: Attrs, body: string) => void, reload: (attrs: Attrs, body: string) => void): (attrs: Attrs, body: string) => void;
export declare function moveItem<T>(list: T[], i: number, d: -1 | 1): void;
export {};
