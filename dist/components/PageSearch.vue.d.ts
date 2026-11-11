import { type SuggestionEntry } from "./SuggestionList.vue";
type __VLS_Props = {
    search: (query: string, signal: AbortSignal) => Promise<SuggestionEntry[]>;
    placeholder: string;
    empty: string;
    searching: string;
    label: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
    pick: (entry: SuggestionEntry) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClose?: (() => any) | undefined;
    onPick?: ((entry: SuggestionEntry) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
