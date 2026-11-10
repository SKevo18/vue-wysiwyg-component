type __VLS_Props = {
    panelClass?: string;
    side?: "bottom" | "top" | "right";
};
declare function close(refocus?: boolean): void;
declare function toggle(): Promise<void>;
declare const __VLS_template: () => {
    __VLS_Slots: {
        trigger?: (props: {
            open: boolean;
            toggle: typeof toggle;
        }) => any;
    } & {
        default?: (props: {
            close: () => void;
        }) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    close: typeof close;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    open: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onOpen?: (() => any) | undefined;
}>, {
    side: "right" | "top" | "bottom";
    panelClass: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
