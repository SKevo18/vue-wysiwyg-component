type __VLS_Props = {
    anchor: HTMLElement | null;
    side?: "bottom" | "right" | "top";
    align?: "start" | "center" | "end";
    anchorCloses?: boolean;
};
declare function place(): void;
declare const __VLS_template: () => {
    __VLS_Slots: {
        default?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    place: typeof place;
    el: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    escape: (event: KeyboardEvent) => any;
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onEscape?: ((event: KeyboardEvent) => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {
    align: "center" | "end" | "start";
    side: "right" | "top" | "bottom";
    anchorCloses: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
