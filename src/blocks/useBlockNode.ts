import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from "vue";
import type { NodeViewProps } from "@tiptap/vue-3";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { BLOCK_EDIT_EVENT } from "../editor/behaviour";
import { contextOf } from "../editor/context";
import { takeFresh } from "../editor/fresh";
import { fragmentHtml } from "../markdown";

const PORTAL_SELECTOR = "[data-block-portal], .wy-modal, [role=dialog], [role=menu], [role=listbox], .wy-slash";

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

export function useBlockNode(props: NodeViewProps, opts: { editOnInsert?: boolean } = {}): BlockNode {
  const editing = ref(false);
  const selected = computed(() => props.selected);
  // `isEditable` is not reactive and a node view outlives a switch to read-only; `setEditable` emits `update`
  const editable = ref(props.editor.isEditable);
  const syncEditable = () => (editable.value = props.editor.isEditable);
  props.editor.on("update", syncEditable);
  const readonly = computed(() => !editable.value);
  const copyText = computed(() => {
    const ctx = contextOf(props.editor);
    if (ctx.config.format === "markdown") return ctx.markdown.serializeNode(props.node);
    return fragmentHtml(Fragment.from(props.node), props.editor.schema);
  });

  function rootEl(): HTMLElement | null {
    const pos = props.getPos();
    const dom = typeof pos === "number" ? props.editor.view.nodeDOM(pos) : null;
    return dom instanceof HTMLElement ? dom : null;
  }

  function selectSelf() {
    const pos = props.getPos();
    if (typeof pos === "number") props.editor.commands.setNodeSelection(pos);
  }

  function onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    const el = rootEl();
    if (!target || !el || el.contains(target)) return;
    // a popup of this block floats outside it; another block's own controls (a form, an embedded database) do not count
    const portal = target.closest(PORTAL_SELECTOR);
    if (portal && !props.editor.view.dom.contains(portal)) return;
    stopEdit();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "Escape" || !editing.value) return;
    e.preventDefault();
    e.stopPropagation();
    stopEdit();
    selectSelf();
    props.editor.view.focus();
  }

  function startEdit() {
    if (readonly.value || editing.value) return;
    editing.value = true;
    selectSelf();
    // let the outside target receive its complete click before collapsing a tall block moves it
    document.addEventListener("click", onDocClick, true);
  }

  function stopEdit() {
    if (!editing.value) return;
    editing.value = false;
    document.removeEventListener("click", onDocClick, true);
  }

  function finishEdit() {
    stopEdit();
    props.editor.commands.focus();
  }

  function onHeaderKey(e: KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const pos = props.getPos();
    if (typeof pos !== "number") return;
    const view = props.editor.view;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 2))));
    view.focus();
  }

  const onEditEvent = () => startEdit();
  let mounted = false;

  onMounted(() => {
    mounted = true;
    const el = rootEl();
    el?.addEventListener("keydown", onKeydown);
    el?.addEventListener(BLOCK_EDIT_EVENT, onEditEvent);
    // the node view is still being constructed here; the selection startEdit dispatches has to wait
    if (opts.editOnInsert && takeFresh(props.node.type.name)) queueMicrotask(() => mounted && startEdit());
  });

  onBeforeUnmount(() => {
    mounted = false;
    stopEdit();
    const el = rootEl();
    el?.removeEventListener("keydown", onKeydown);
    el?.removeEventListener(BLOCK_EDIT_EVENT, onEditEvent);
    props.editor.off("update", syncEditable);
  });

  return {
    selected,
    editing,
    startEdit,
    stopEdit,
    finishEdit,
    update: (attrs) => props.updateAttributes(attrs),
    remove() {
      stopEdit();
      props.deleteNode();
    },
    copyText,
    readonly,
    onKeydown,
    onHeaderKey,
  };
}
