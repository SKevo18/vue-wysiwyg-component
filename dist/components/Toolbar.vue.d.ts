import type { Editor } from "@tiptap/core";
type __VLS_Props = {
    editor: Editor;
    tick: number;
    mode: "visual" | "source";
    blockMenuOpen: boolean;
    fullscreen: boolean;
    showFocus: boolean;
    showSource: boolean;
    serverUndo: boolean;
    serverRedo: boolean;
};
declare const __VLS_template: () => {
    __VLS_Slots: {
        status?: (props: {}) => any;
    } & {
        actions?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    link: () => any;
    "block-menu": (button: HTMLElement) => any;
    "toggle-fullscreen": () => any;
    "set-mode": (mode: "source" | "visual") => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onLink?: (() => any) | undefined;
    "onBlock-menu"?: ((button: HTMLElement) => any) | undefined;
    "onToggle-fullscreen"?: (() => any) | undefined;
    "onSet-mode"?: ((mode: "source" | "visual") => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
