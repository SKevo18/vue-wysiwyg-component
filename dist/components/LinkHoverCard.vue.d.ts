import type { Editor } from "@tiptap/core";
type __VLS_Props = {
    editor: Editor;
    tick: number;
    readonly: boolean;
    focused: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    edit: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onEdit?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
