<script setup lang="ts">
// the instruction and scope above the block's content, while it is edited or has no instruction yet. Generate
// streams `services.aiGenerate` into the content, which stays ordinary blocks. the whole generation is one undo
// step back to the content before it. Done, or a click away, folds the instruction away
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from "vue";
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { Fragment } from "@tiptap/pm/model";
import { Sparkles } from "@lucide/vue";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, update, remove, copyText, readonly, onKeydown } = useBlockNode(props, { editOnInsert: true });
const scopes = computed(() => ctx.services.aiScopes ?? []);
const prompt = computed<string>(() => props.node.attrs.prompt ?? "");
const scope = computed<string>(() => props.node.attrs.scope || scopes.value[0]?.id || "");
const updatedAt = computed<string>(() => props.node.attrs.updatedAt ?? "");
const busy = ref(false);
const error = ref("");
const area = ref<HTMLTextAreaElement | null>(null);
const panel = computed(() => !readonly.value && (editing.value || busy.value || !prompt.value.trim()));
const canGenerate = computed(() => !!ctx.services.aiGenerate && !!prompt.value.trim());
const updatedLabel = computed(() => {
  const d = new Date(updatedAt.value);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat(ctx.locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
});
let abort: AbortController | null = null;

watch(editing, async (on) => {
  if (!on) return;
  await nextTick();
  area.value?.focus();
});
onBeforeUnmount(() => abort?.abort());

/** the content becomes the blocks of `md`; returns false once the block is gone */
function setContent(md: string | Fragment, history: boolean, attrs?: Record<string, unknown>): boolean {
  const pos = props.getPos();
  const node = typeof pos === "number" ? props.editor.state.doc.nodeAt(pos) : null;
  if (typeof pos !== "number" || node?.type.name !== "aiBlock") return false;
  const schema = props.editor.schema;
  const parsed = typeof md === "string" ? (md.trim() ? ctx.markdown.parse(md, schema).content : Fragment.empty) : md;
  const tr = props.editor.state.tr.replaceWith(pos + 1, pos + node.nodeSize - 1, parsed.size ? parsed : schema.nodes.paragraph!.create());
  if (attrs) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
  tr.setMeta("addToHistory", history);
  props.editor.view.dispatch(tr);
  return true;
}

function documentMarkdown(): string {
  try {
    return ctx.markdown.serialize(props.editor.state.doc);
  } catch {
    return props.editor.state.doc.textBetween(0, props.editor.state.doc.content.size, "\n\n");
  }
}

async function generate() {
  const run = ctx.services.aiGenerate;
  if (!run || busy.value || !prompt.value.trim()) return;
  // the raw node: a reactive proxy of it would not match its own node types in the schema
  const before = toRaw(props.node).content;
  const ctrl = (abort = new AbortController());
  busy.value = true;
  error.value = "";
  let text = "";
  let frame = 0;
  const flush = () => {
    frame = 0;
    if (!setContent(text, false)) ctrl.abort();
  };
  try {
    for await (const piece of run({ prompt: prompt.value, scope: scope.value, document: documentMarkdown() }, ctrl.signal)) {
      if (ctrl.signal.aborted) break;
      text += piece;
      frame ||= requestAnimationFrame(flush);
    }
  } catch (e) {
    if (!ctrl.signal.aborted) error.value = e instanceof Error && e.message ? e.message : t("ai.failed");
  } finally {
    cancelAnimationFrame(frame);
    busy.value = false;
    abort = null;
    // one undo step from the content before to what was written, also after Stop
    if (text.trim() && setContent(before, false)) setContent(text, true, { updatedAt: new Date().toISOString() });
    else setContent(before, false);
  }
}

function stop() {
  abort?.abort();
}

function onPromptKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void generate();
    return;
  }
  onKeydown(e);
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-ai">
    <BlockFrame :label="t('ai.label')" :selected="selected" :editing="panel" :readonly="readonly" :copy-text="copyText" @edit="startEdit" @delete="remove">
      <div class="wy-ai-block" :class="{ 'is-busy': busy }">
        <div v-if="panel" class="wy-ai-panel" contenteditable="false">
          <div class="wy-ai-prompt">
            <Sparkles class="wy-ai-icon" :size="16" aria-hidden="true" />
            <textarea
              ref="area"
              class="wy-ai-input"
              rows="1"
              :value="prompt"
              :placeholder="t('ai.promptPlaceholder')"
              :aria-label="t('ai.prompt')"
              :disabled="busy"
              @input="update({ prompt: ($event.target as HTMLTextAreaElement).value })"
              @keydown="onPromptKey"
            ></textarea>
          </div>
          <div class="wy-ai-bar">
            <select v-if="scopes.length" class="wy-input is-sm wy-ai-scope" :value="scope" :aria-label="t('ai.scope')" :disabled="busy" @change="update({ scope: ($event.target as HTMLSelectElement).value })">
              <option v-for="s in scopes" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
            <span v-if="busy" class="wy-ai-status">{{ t("ai.writing") }}</span>
            <span v-else-if="error" class="wy-ai-error" role="alert">{{ error }}</span>
            <span v-else-if="updatedLabel" class="wy-ai-status">{{ t("ai.updated", { date: updatedLabel }) }}</span>
            <span class="wy-ai-spacer"></span>
            <button v-if="busy" type="button" class="wy-btn is-sm" @click="stop">{{ t("ai.stop") }}</button>
            <template v-else>
              <button type="button" class="wy-btn is-sm is-primary" :disabled="!canGenerate" @click="generate">{{ updatedAt ? t("ai.regenerate") : t("ai.generate") }}</button>
              <button v-if="prompt.trim()" type="button" class="wy-btn is-sm" @click="finishEdit">{{ t("ai.done") }}</button>
            </template>
          </div>
        </div>
        <NodeViewContent class="wy-ai-content" />
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
