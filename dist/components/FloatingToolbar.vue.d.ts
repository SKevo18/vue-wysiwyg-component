import type { Editor } from "@tiptap/core";
type __VLS_Props = {
    editor: Editor;
    tick: number;
    readonly?: boolean;
    full?: boolean;
};
/** for Alt+F10 in the editor; false when the toolbar is hidden */
declare function focusFirst(): boolean;
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {
    focusFirst: typeof focusFirst;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    link: () => any;
    convert: (button: HTMLElement) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onLink?: (() => any) | undefined;
    onConvert?: ((button: HTMLElement) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
