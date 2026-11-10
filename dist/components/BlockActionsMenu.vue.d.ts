import type { Editor } from "@tiptap/core";
import { type BlockRun } from "../editor/convert";
type __VLS_Props = {
    editor: Editor;
    run: BlockRun;
    anchor: HTMLElement;
    convertOnly?: boolean;
    selectAll?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClose?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
