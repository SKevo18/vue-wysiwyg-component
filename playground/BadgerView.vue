<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref } from "vue";
import { BlockFrame, useBlockNode, useFenceSync } from "@skevo18/vue-wysiwyg-component";

const props = defineProps(nodeViewProps);
const { selected, editing, startEdit, remove, copyText, readonly, update } = useBlockNode(props, { editOnInsert: true });
const node = computed(() => ({ attrs: props.node.attrs.attrs as Record<string, string>, body: props.node.attrs.body as string }));
const sett = ref(node.value.attrs.sett ?? "");
const body = ref(node.value.body);
const publish = useFenceSync(node, (attrs, b) => update({ attrs, body: b }), (attrs, b) => ((sett.value = attrs.sett ?? ""), (body.value = b)));
const rows = computed(() => body.value.split("\n").map((l) => l.split(":")).filter((p) => p.length === 2).map(([a, n]) => ({ animal: a!.trim(), count: Number(n) || 0 })));
const total = computed(() => rows.value.reduce((s, r) => s + r.count, 0));
function save() {
  publish({ ...node.value.attrs, sett: sett.value }, body.value);
}
</script>

<template>
  <NodeViewWrapper class="wy-node">
    <BlockFrame label="Badger census" :selected="selected" :editing="editing" :readonly="readonly" :copy-text="copyText" @edit="startEdit" @delete="remove">
      <div v-if="!editing" class="census" @click="startEdit">
        <strong>Sett {{ node.attrs.sett }}</strong>: {{ total }} animals
        <ul><li v-for="r in rows" :key="r.animal">{{ r.animal }}: {{ r.count }}</li></ul>
      </div>
      <div v-else class="census-form" contenteditable="false" data-block-portal @mousedown.stop>
        <input v-model="sett" class="wy-input" placeholder="Sett" @input="save" />
        <textarea v-model="body" class="wy-input is-mono" rows="3" @input="save"></textarea>
      </div>
    </BlockFrame>
  </NodeViewWrapper>
</template>
