import type { FigureAlign } from "../core/media";
type __VLS_Props = {
    box: HTMLElement | null;
    aligns: readonly FigureAlign[];
    align: FigureAlign;
    width: number;
    resettable: boolean;
    zoomable: boolean;
};
declare function place(): void;
declare const __VLS_template: () => {
    __VLS_Slots: {
        default?: (props: {}) => any;
    } & {
        form?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    place: typeof place;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    width: (percent: number) => any;
    align: (align: "left" | "center" | "right" | "float-left" | "float-right") => any;
    reset: () => any;
    zoom: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onWidth?: ((percent: number) => any) | undefined;
    onAlign?: ((align: "left" | "center" | "right" | "float-left" | "float-right") => any) | undefined;
    onReset?: (() => any) | undefined;
    onZoom?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
