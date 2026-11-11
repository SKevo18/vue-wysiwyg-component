import type { ResolvedTarget } from "../editor/convert";
import type { SlashItem } from "../types";
type __VLS_Props = {
    targets: ResolvedTarget[];
    inserts?: SlashItem[];
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {
    focus: () => void | undefined;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    pick: (target: string) => any;
    insert: (item: SlashItem) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onPick?: ((target: string) => any) | undefined;
    onInsert?: ((item: SlashItem) => any) | undefined;
}>, {
    inserts: SlashItem[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
