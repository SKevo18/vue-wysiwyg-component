import type { Editor } from "@tiptap/core";
type __VLS_Props = {
    editor: Editor;
    color: string;
    highlight: string;
    block?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    done: () => any;
    pick: (token: string | null) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDone?: (() => any) | undefined;
    onPick?: ((token: string | null) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
