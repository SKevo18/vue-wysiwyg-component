import { type Translate } from "../i18n";
type __VLS_Props = {
    value?: string;
    t?: Translate;
    autofocus?: boolean;
};
declare const __VLS_template: () => {
    __VLS_Slots: {
        footer?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    pick: (emoji: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onPick?: ((emoji: string) => any) | undefined;
}>, {
    value: string;
    autofocus: boolean;
    t: Translate;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
