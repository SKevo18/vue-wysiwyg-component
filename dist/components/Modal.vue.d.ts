declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<{
    open: boolean;
    title?: string;
    size?: "sm" | "lg";
    closeLabel?: string;
}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
}, string, import("vue").PublicProps, Readonly<{
    open: boolean;
    title?: string;
    size?: "sm" | "lg";
    closeLabel?: string;
}> & Readonly<{
    onClose?: (() => any) | undefined;
}>, {
    title: string;
    size: "sm" | "lg";
    closeLabel: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, {
    head?: (props: {}) => any;
} & {
    default?: (props: {}) => any;
}>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
