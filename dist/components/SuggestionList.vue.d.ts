import { type Component } from "vue";
export interface SuggestionEntry {
    key: string;
    title: string;
    detail?: string;
    /** a component, an image URL or an emoji */
    icon?: Component | string;
    group?: string;
}
type __VLS_Props = {
    items: SuggestionEntry[];
    loading?: boolean;
    empty?: string;
    label?: string;
};
declare function onKeyDown(e: KeyboardEvent): boolean;
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {
    onKeyDown: typeof onKeyDown;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    pick: (entry: SuggestionEntry) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onPick?: ((entry: SuggestionEntry) => any) | undefined;
}>, {
    label: string;
    empty: string;
    loading: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
