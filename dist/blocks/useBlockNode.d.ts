import { type ComputedRef, type Ref } from "vue";
import type { NodeViewProps } from "@tiptap/vue-3";
export interface BlockNode {
    selected: ComputedRef<boolean>;
    editing: Ref<boolean>;
    startEdit(): void;
    stopEdit(): void;
    finishEdit(): void;
    update(attrs: Record<string, unknown>): void;
    remove(): void;
    copyText: ComputedRef<string>;
    readonly: ComputedRef<boolean>;
    onKeydown(e: KeyboardEvent): void;
    onHeaderKey(e: KeyboardEvent): void;
}
export declare function useBlockNode(props: NodeViewProps, opts?: {
    editOnInsert?: boolean;
}): BlockNode;
