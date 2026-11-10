import type { Editor } from "@tiptap/core";
type __VLS_Props = {
    editor: Editor;
    tick: number;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    link: () => any;
    convert: (button: HTMLElement) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onLink?: (() => any) | undefined;
    onConvert?: ((button: HTMLElement) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
