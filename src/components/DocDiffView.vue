<script setup lang="ts">
// Shows what changed between two versions of a document: the newer one read-only with the editor's own blocks and
// node views, added words and blocks green, removed ones kept in place, struck through and red.
import { inject, shallowRef, watch } from "vue";
import { createDocument, type Editor } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { contextOf, EDITOR_CONTEXT } from "../editor/context";
import { WYSIWYG_DEFAULTS } from "../plugin";
import { diffDocs, type DiffBlock, type DocNode } from "../diff/docdiff";
import { DiffDecorations, diffDocument, diffKey, fitSchema } from "../diff/render";
import type { Locale, Messages } from "../i18n";
import type { BaseOptions, DeepPartial, EditorExtension, EditorHandle, EditorServices } from "../types";
import WysiwygEditor from "./WysiwygEditor.vue";

defineOptions({ name: "DocDiffView" });

const props = withDefaults(
  defineProps<{
    /** the older version; null shows the newer one as wholly added */
    before: DocNode | string | null;
    after: DocNode | string;
    /** `json`: ProseMirror JSON (objects or JSON strings); `markdown` and `html` are parsed with the editor's schema */
    format?: "json" | "markdown" | "html";
    /** read once at mount, like the editor's */
    extensions?: readonly EditorExtension[];
    base?: BaseOptions;
    services?: EditorServices;
    locale?: Locale;
    messages?: DeepPartial<Messages> & Record<string, unknown>;
    contentClass?: string;
  }>(),
  { format: "json", extensions: undefined, base: undefined, services: undefined, locale: undefined, messages: undefined, contentClass: "" },
);

const emit = defineEmits<{
  /** the block diff shown, after each render */
  diff: [blocks: DiffBlock[]];
}>();

const inherited = inject(EDITOR_CONTEXT, null)?.inherit ?? inject(WYSIWYG_DEFAULTS, {});
const DIFF: EditorExtension = { name: "docDiff", tiptap: [DiffDecorations] };
const extensions: readonly EditorExtension[] = [...(props.extensions ?? inherited.extensions ?? []), DIFF];
const editor = shallowRef<Editor | null>(null);

function parse(e: Editor, value: DocNode | string): DocNode {
  if (typeof value !== "string") return value;
  if (props.format === "json") return JSON.parse(value) as DocNode;
  if (props.format === "html") return createDocument(value, e.schema, { preserveWhitespace: false }).toJSON() as DocNode;
  return contextOf(e).markdown.parse(value, e.schema).toJSON() as DocNode;
}

function render() {
  const e = editor.value;
  if (!e) return;
  const ctx = contextOf(e);
  const schema = e.schema;
  const empty: DocNode = { type: "doc", content: [] };
  const fitted = (v: DocNode | string) => fitSchema(parse(e, v), schema) ?? empty;
  const diagrams: readonly string[] = ctx.config.base.diagrams;
  const blocks = diffDocs(props.before === null ? null : fitted(props.before), fitted(props.after), {
    schema,
    atomic: (n) => n.type === "codeBlock" && typeof n.attrs?.language === "string" && diagrams.includes(n.attrs.language),
  });
  const { doc, decorations } = diffDocument(schema, blocks, { movedHere: ctx.t("diff.movedHere"), movedAway: ctx.t("diff.movedAway"), changed: ctx.t("diff.changed") });
  const tr = e.state.tr.replaceWith(0, e.state.doc.content.size, doc.content);
  // the old selection would map onto a block at the end, which then shows as selected
  tr.setSelection(Selection.findFrom(tr.doc.resolve(0), 1, true) ?? Selection.atStart(tr.doc));
  tr.setMeta(diffKey, DecorationSet.create(tr.doc, decorations)).setMeta("addToHistory", false);
  e.view.dispatch(tr);
  emit("diff", blocks);
}

function onReady(handle: EditorHandle) {
  editor.value = handle.editor;
  render();
}

watch(() => [props.before, props.after, props.format], render);
</script>

<template>
  <WysiwygEditor
    class="wy-diff"
    model-value=""
    :format="format === 'html' ? 'html' : 'markdown'"
    :extensions="extensions"
    :base="base"
    :services="services"
    :locale="locale"
    :messages="messages"
    :content-class="contentClass"
    :gutter="false"
    readonly
    @ready="onReady"
  />
</template>
