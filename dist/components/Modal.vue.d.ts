declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<{
    open: boolean;
    title?: string;
    size?: "sm" | "lg";
    closeLabel?: string; /** the wheel over the dialog scrolls the page it was opened from */
    passWheel?: boolean;
}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
}, string, import("vue").PublicProps, Readonly<{
    open: boolean;
    title?: string;
    size?: "sm" | "lg";
    closeLabel?: string; /** the wheel over the dialog scrolls the page it was opened from */
    passWheel?: boolean;
}> & Readonly<{
    onClose?: (() => any) | undefined;
}>, {
    title: string;
    size: "sm" | "lg";
    closeLabel: string;
    passWheel: boolean;
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
