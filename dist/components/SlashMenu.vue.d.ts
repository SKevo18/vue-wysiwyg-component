import type { SlashItem } from "../types";
type __VLS_Props = {
    items: SlashItem[];
    command: (item: SlashItem) => void;
    inCell?: boolean;
    groupLabel: (id: string) => string;
    t: (key: string) => string;
};
declare function onKeyDown(e: KeyboardEvent): boolean;
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {
    onKeyDown: typeof onKeyDown;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
