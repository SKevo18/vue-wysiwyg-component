type __VLS_Props = {
    label: string;
    selected?: boolean;
    editing?: boolean;
    readonly?: boolean;
    copyText?: string;
    editable?: boolean;
    deletable?: boolean;
};
declare const __VLS_template: () => {
    __VLS_Slots: {
        default?: (props: {}) => any;
    } & {
        menu?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    delete: () => any;
    edit: () => any;
    more: (event: MouseEvent) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDelete?: (() => any) | undefined;
    onEdit?: (() => any) | undefined;
    onMore?: ((event: MouseEvent) => any) | undefined;
}>, {
    selected: boolean;
    editing: boolean;
    readonly: boolean;
    copyText: string;
    editable: boolean;
    deletable: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
