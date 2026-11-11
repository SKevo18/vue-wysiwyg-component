<script setup lang="ts">
// a click runs the actions in order (a readonly editor skips the ones that edit). Edit, from the tools on hover,
// opens the label and the action list below the button
import { computed, nextTick, ref, watch } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { ArrowDown, ArrowUp, Plus, Trash2, Zap } from "@lucide/vue";
import { buttonActionDefs } from "../builtins/button";
import { contextOf } from "../editor/context";
import BlockFrame from "../blocks/BlockFrame.vue";
import { useBlockNode } from "../blocks/useBlockNode";
import { vTooltip } from "../components/tooltip";
import type { ButtonAction, ButtonActionField } from "../types";

const props = defineProps(nodeViewProps);
const ctx = contextOf(props.editor);
const t = ctx.t;
const { selected, editing, startEdit, finishEdit, update, remove, copyText, readonly, onKeydown } = useBlockNode(props, { editOnInsert: true });
const defs = buttonActionDefs(ctx.services);
const label = computed<string>(() => props.node.attrs.label ?? "");
const actions = computed<ButtonAction[]>(() => props.node.attrs.actions ?? []);
const running = ref(false);
const labelInput = ref<HTMLInputElement | null>(null);

const kindLabel = (kind: string) => ctx.text(defs[kind]?.label, `button.kinds.${kind}`) || kind;
const fieldLabel = (f: ButtonActionField) => ctx.text(f.label, `button.fields.${f.key}`) || f.key;
const fieldPlaceholder = (f: ButtonActionField) => ctx.text(f.placeholder, `button.placeholders.${f.key}`);
const runs = (a: ButtonAction) => !!defs[a.kind] && (!readonly.value || defs[a.kind]!.readonly !== false);

watch(editing, async (on) => {
  if (!on) return;
  await nextTick();
  labelInput.value?.focus();
});

async function run(event: MouseEvent) {
  const pos = props.getPos();
  if (running.value || typeof pos !== "number") return;
  running.value = true;
  try {
    for (const a of actions.value) {
      if (runs(a)) await defs[a.kind]!.run(a, { editor: props.editor, pos, services: ctx.services, event });
    }
  } catch (e) {
    ctx.services.toast?.(e instanceof Error ? e.message : String(e), "error");
  } finally {
    running.value = false;
  }
}

function setActions(next: ButtonAction[]) {
  update({ actions: next });
}

function setField(i: number, key: string, value: string) {
  setActions(actions.value.map((a, k) => (k === i ? { ...a, [key]: value } : a)));
}

function setKind(i: number, kind: string) {
  setActions(actions.value.map((a, k) => (k === i ? { kind } : a)));
}

function move(i: number, dir: -1 | 1) {
  const next = [...actions.value];
  const [a] = next.splice(i, 1);
  next.splice(i + dir, 0, a!);
  setActions(next);
}

function fieldValue(a: ButtonAction, key: string): string {
  const v = a[key];
  return typeof v === "string" ? v : "";
}
</script>

<template>
  <NodeViewWrapper as="div" class="wy-node wy-node-button">
    <BlockFrame :label="t('button.label')" :selected="selected" :editing="editing" :readonly="readonly" :copy-text="copyText" @edit="startEdit" @delete="remove">
      <div class="wy-button-block" contenteditable="false">
        <button type="button" class="wy-button" :disabled="running || !actions.some(runs)" @mousedown.prevent @click="run"><Zap :size="14" aria-hidden="true" />{{ label || t("button.untitled") }}</button>
      </div>
      <div v-if="editing" class="wy-button-editor" contenteditable="false" @keydown="onKeydown">
        <label class="wy-field">
          <span class="wy-label">{{ t("button.labelField") }}</span>
          <input ref="labelInput" class="wy-input is-sm" :value="label" :placeholder="t('button.untitled')" @input="update({ label: ($event.target as HTMLInputElement).value })" @keydown.enter.prevent="finishEdit" />
        </label>
        <span class="wy-label">{{ t("button.actions") }}</span>
        <p v-if="!actions.length" class="wy-menu-hint">{{ t("button.noActions") }}</p>
        <div v-for="(a, i) in actions" :key="i" class="wy-button-action">
          <div class="wy-button-action-head">
            <component :is="defs[a.kind]?.icon" v-if="defs[a.kind]?.icon" :size="15" aria-hidden="true" />
            <select class="wy-input is-sm" :value="a.kind" :aria-label="t('button.kind')" @change="setKind(i, ($event.target as HTMLSelectElement).value)">
              <option v-for="(_, k) in defs" :key="k" :value="k">{{ kindLabel(String(k)) }}</option>
              <option v-if="!defs[a.kind]" :value="a.kind">{{ a.kind }}</option>
            </select>
            <button v-tooltip="t('button.moveUp')" type="button" class="wy-icon-btn" :aria-label="t('button.moveUp')" :disabled="i === 0" @click="move(i, -1)"><ArrowUp :size="14" /></button>
            <button v-tooltip="t('button.moveDown')" type="button" class="wy-icon-btn" :aria-label="t('button.moveDown')" :disabled="i === actions.length - 1" @click="move(i, 1)"><ArrowDown :size="14" /></button>
            <button v-tooltip="t('button.removeAction')" type="button" class="wy-icon-btn is-danger" :aria-label="t('button.removeAction')" @click="setActions(actions.filter((_, k) => k !== i))"><Trash2 :size="14" /></button>
          </div>
          <label v-for="f in defs[a.kind]?.fields ?? []" :key="f.key" class="wy-field">
            <span class="wy-label">{{ fieldLabel(f) }}</span>
            <textarea v-if="f.multiline" class="wy-input is-sm is-mono" rows="3" :value="fieldValue(a, f.key)" :placeholder="fieldPlaceholder(f)" spellcheck="false" @input="setField(i, f.key, ($event.target as HTMLTextAreaElement).value)"></textarea>
            <input v-else class="wy-input is-sm" :value="fieldValue(a, f.key)" :placeholder="fieldPlaceholder(f)" @input="setField(i, f.key, ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
        <div class="wy-button-editor-foot">
          <button type="button" class="wy-btn is-sm" @click="setActions([...actions, { kind: 'insert', markdown: '' }])"><Plus :size="14" />{{ t("button.addAction") }}</button>
          <button type="button" class="wy-btn is-sm is-primary" @click="finishEdit">{{ t("button.done") }}</button>
        </div>
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
