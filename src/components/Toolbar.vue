<script setup lang="ts">
import { computed, ref } from "vue";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  FileCode,
  Image,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Maximize2,
  MoreHorizontal,
  MessageSquareQuote,
  Minimize2,
  Paperclip,
  Plus,
  Quote,
  Redo2,
  Undo2,
} from "@lucide/vue";
import { BULLET_STYLES, ORDERED_STYLES, validChar, type ListKind } from "../core/attrs";
import { useEditorContext } from "../editor/context";
import { groupLabel } from "../editor/catalog";
import { isInCell } from "../editor/tables";
import ColorTool from "./ColorTool.vue";
import Dropdown from "./Dropdown.vue";
import MarkButtons from "./MarkButtons.vue";
import { vTooltip } from "./tooltip";

const props = defineProps<{
  editor: Editor;
  tick: number;
  mode: "visual" | "source";
  blockMenuOpen: boolean;
  fullscreen: boolean;
  showFocus: boolean;
  showSource: boolean;
  serverUndo: boolean;
  serverRedo: boolean;
}>();
const emit = defineEmits<{ link: []; "block-menu": [button: HTMLElement]; "toggle-fullscreen": []; "set-mode": [mode: "visual" | "source"] }>();
const ctx = useEditorContext();
const t = ctx.t;
const b = ctx.config.base;
const canUpload = !!ctx.services.upload;

function innermostList(e: Editor): { pos: number; node: PMNode; kind: ListKind } | null {
  const $from = e.state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    if (n.type.name === "taskList") return null;
    if (n.type.name === "bulletList" || n.type.name === "orderedList") return { pos: $from.before(d), node: n, kind: n.type.name === "orderedList" ? "ordered" : "bullet" };
  }
  return null;
}

const state = computed(() => {
  void props.tick;
  const e = props.editor;
  const level = b.headings.find((l) => e.isActive("heading", { level: l })) ?? 0;
  const list = b.listStyles ? innermostList(e) : null;
  const align = (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left";
  return {
    block: e.isActive("codeBlock") ? "code" : level ? `h${level}` : "p",
    link: e.isActive("link"),
    bulletList: e.isActive("bulletList"),
    orderedList: e.isActive("orderedList"),
    taskList: e.isActive("taskList"),
    blockquote: e.isActive("blockquote"),
    callout: e.isActive("callout"),
    align,
    inCell: isInCell(e.state.selection.$from),
    undo: e.can().undo() || props.serverUndo,
    redo: e.can().redo() || props.serverRedo,
    list: list && { kind: list.kind, style: (list.node.attrs.listStyle as string | null) ?? (list.kind === "ordered" ? "decimal" : "disc"), marker: (list.node.attrs.marker as string | null) ?? "" },
  };
});

const markerInput = ref("");
const markerInvalid = ref(false);
const LIST_SAMPLES: Record<string, string> = { decimal: "1.", "lower-alpha": "a.", "upper-alpha": "A.", "lower-roman": "i.", "upper-roman": "I.", disc: "•", circle: "◦", square: "▪", dash: "–", arrow: "→" };
const ALIGNS = [
  { id: "left", icon: AlignLeft, label: "toolbar.alignLeft" },
  { id: "center", icon: AlignCenter, label: "toolbar.alignCenter" },
  { id: "right", icon: AlignRight, label: "toolbar.alignRight" },
  { id: "justify", icon: AlignJustify, label: "toolbar.alignJustify" },
] as const;

function setListStyle(kind: ListKind, style: string | null, marker: string | null = null) {
  const e = props.editor;
  const list = innermostList(e);
  if (!list) return;
  const listStyle = style === "decimal" || style === "disc" ? null : style;
  const type = e.schema.nodes[kind === "ordered" ? "orderedList" : "bulletList"]!;
  const attrs = kind === "ordered" ? { start: list.kind === "ordered" ? list.node.attrs.start : 1, listStyle } : { listStyle, marker };
  e.chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(list.pos, type, attrs);
      return true;
    })
    .run();
}

function applyMarker(close: () => void) {
  const v = markerInput.value.trim();
  markerInvalid.value = !validChar(v);
  if (markerInvalid.value) return;
  setListStyle("bullet", null, v);
  close();
}

const groups = computed(() => {
  const ids: string[] = [];
  for (const i of ctx.slashItems) if (!ids.includes(i.group)) ids.push(i.group);
  return ids.map((g) => ({ group: g, label: groupLabel(ctx.config, g, ctx.text), items: ctx.slashItems.filter((i) => i.group === g) }));
});

function setBlock(ev: Event) {
  const v = (ev.target as HTMLSelectElement).value;
  const c = props.editor.chain().focus();
  if (v === "p") c.setParagraph().run();
  else if (v === "code") c.setCodeBlock().run();
  else c.setHeading({ level: Number(v.slice(1)) as 1 }).run();
}

function toggleCallout() {
  const e = props.editor;
  if (e.isActive("callout")) e.chain().focus().lift("callout").run();
  else e.chain().focus().wrapIn("callout", { type: b.callouts[0], title: "" }).run();
}
</script>

<template>
  <div class="wy-toolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <div class="wy-toolbar-scroll">
      <template v-if="mode === 'visual'">
        <div class="wy-group">
          <button v-tooltip="{ text: t('toolbar.undo'), keys: 'Mod-z' }" type="button" class="wy-tool" :aria-label="t('toolbar.undo')" :disabled="!state.undo" @mousedown.prevent @click="editor.chain().focus().historyUndo().run()"><Undo2 :size="18" /></button>
          <button v-tooltip="{ text: t('toolbar.redo'), keys: 'Mod-Shift-z' }" type="button" class="wy-tool" :aria-label="t('toolbar.redo')" :disabled="!state.redo" @mousedown.prevent @click="editor.chain().focus().historyRedo().run()"><Redo2 :size="18" /></button>
          <button v-tooltip="t('blockMenu.label')" type="button" class="wy-tool" :aria-label="t('blockMenu.label')" aria-haspopup="menu" :aria-expanded="blockMenuOpen" :disabled="state.inCell" @mousedown.prevent @click="emit('block-menu', $event.currentTarget as HTMLElement)"><MoreHorizontal :size="18" /></button>
        </div>
        <template v-if="b.headings.length || b.codeBlocks">
          <span class="wy-sep"></span>
          <select class="wy-select" :value="state.block" :aria-label="t('toolbar.textStyle')" :disabled="state.inCell" @mousedown.stop @change="setBlock">
            <option value="p">{{ t("toolbar.paragraph") }}</option>
            <option v-for="l in b.headings" :key="l" :value="`h${l}`">{{ t("toolbar.heading", { n: l }) }}</option>
            <option v-if="b.codeBlocks" value="code">{{ t("toolbar.codeBlock") }}</option>
          </select>
        </template>
        <span class="wy-sep"></span>
        <div class="wy-group">
          <MarkButtons :editor="editor" :tick="tick" />
          <ColorTool v-if="b.color || b.highlight" :editor="editor" :tick="tick" />
          <Dropdown v-if="b.textAlign">
            <template #trigger="{ open, toggle }">
              <button v-tooltip="t('toolbar.align')" type="button" class="wy-tool" :aria-label="t('toolbar.align')" aria-haspopup="menu" :aria-expanded="open" :disabled="state.inCell" @mousedown.prevent @click="toggle">
                <component :is="ALIGNS.find((a) => a.id === state.align)?.icon ?? AlignLeft" :size="18" />
              </button>
            </template>
            <template #default="{ close }">
              <div role="menu" class="wy-menu-row">
                <button v-for="a in ALIGNS" :key="a.id" v-tooltip="t(a.label)" type="button" class="wy-tool" role="menuitemradio" :aria-label="t(a.label)" :aria-checked="state.align === a.id" :aria-pressed="state.align === a.id" @mousedown.prevent @click="(editor.chain().focus().setTextAlign(a.id).run(), close())">
                  <component :is="a.icon" :size="18" />
                </button>
              </div>
            </template>
          </Dropdown>
        </div>
        <template v-if="b.lists || b.taskLists || b.blockquote || b.callouts.length">
          <span class="wy-sep"></span>
          <div class="wy-group">
            <button v-if="b.lists" v-tooltip="t('toolbar.bulletList')" type="button" class="wy-tool" :aria-label="t('toolbar.bulletList')" :aria-pressed="state.bulletList" :disabled="state.inCell" @mousedown.prevent @click="editor.chain().focus().toggleBulletList().run()"><List :size="18" /></button>
            <button v-if="b.lists" v-tooltip="t('toolbar.orderedList')" type="button" class="wy-tool" :aria-label="t('toolbar.orderedList')" :aria-pressed="state.orderedList" :disabled="state.inCell" @mousedown.prevent @click="editor.chain().focus().toggleOrderedList().run()"><ListOrdered :size="18" /></button>
            <Dropdown v-if="b.listStyles && b.lists" panel-class="wy-list-style-panel" @open="(markerInput = state.list?.marker ?? ''), (markerInvalid = false)">
              <template #trigger="{ open, toggle }">
                <button v-tooltip="t('toolbar.listStyle')" type="button" class="wy-tool is-narrow" :aria-label="t('toolbar.listStyle')" aria-haspopup="menu" :aria-expanded="open" :disabled="!state.list" @mousedown.prevent @click="toggle"><ChevronDown :size="14" /></button>
              </template>
              <template #default="{ close }">
                <div v-if="state.list" role="menu" :aria-label="t('toolbar.listStyle')">
                  <div class="wy-menu-heading">{{ t("listStyle.numbering") }}</div>
                  <button v-for="s in ORDERED_STYLES" :key="s" type="button" class="wy-menu-item" role="menuitemradio" :aria-checked="state.list.kind === 'ordered' && state.list.style === s" @mousedown.prevent @click="(setListStyle('ordered', s), close())">
                    <span class="wy-menu-sample" aria-hidden="true">{{ LIST_SAMPLES[s] }}</span>{{ t(`listStyle.styles.${s}`) }}
                  </button>
                  <div class="wy-menu-heading">{{ t("listStyle.bullets") }}</div>
                  <button v-for="s in BULLET_STYLES" :key="s" type="button" class="wy-menu-item" role="menuitemradio" :aria-checked="state.list.kind === 'bullet' && !state.list.marker && state.list.style === s" @mousedown.prevent @click="(setListStyle('bullet', s), close())">
                    <span class="wy-menu-sample" aria-hidden="true">{{ LIST_SAMPLES[s] }}</span>{{ t(`listStyle.styles.${s}`) }}
                  </button>
                  <div class="wy-menu-heading">{{ t("listStyle.custom") }}</div>
                  <form class="wy-menu-form" @submit.prevent="applyMarker(close)">
                    <input v-model="markerInput" class="wy-input is-sm" maxlength="16" spellcheck="false" :aria-label="t('listStyle.custom')" :aria-invalid="markerInvalid || undefined" />
                    <button type="submit" class="wy-btn is-sm">{{ t("listStyle.apply") }}</button>
                  </form>
                  <p v-if="markerInvalid" class="wy-menu-hint is-danger">{{ t("listStyle.customHint") }}</p>
                </div>
              </template>
            </Dropdown>
            <button v-if="b.taskLists" v-tooltip="t('toolbar.taskList')" type="button" class="wy-tool" :aria-label="t('toolbar.taskList')" :aria-pressed="state.taskList" :disabled="state.inCell" @mousedown.prevent @click="editor.chain().focus().toggleTaskList().run()"><ListTodo :size="18" /></button>
            <button v-if="b.blockquote" v-tooltip="t('toolbar.quote')" type="button" class="wy-tool" :aria-label="t('toolbar.quote')" :aria-pressed="state.blockquote" :disabled="state.inCell" @mousedown.prevent @click="editor.chain().focus().toggleBlockquote().run()"><Quote :size="18" /></button>
            <button v-if="b.callouts.length" v-tooltip="t('toolbar.callout')" type="button" class="wy-tool" :aria-label="t('toolbar.callout')" :aria-pressed="state.callout" :disabled="state.inCell" @mousedown.prevent @click="toggleCallout"><MessageSquareQuote :size="18" /></button>
          </div>
        </template>
        <span class="wy-sep"></span>
        <div class="wy-group">
          <Dropdown v-if="ctx.slashItems.length" panel-class="wy-insert-panel">
            <template #trigger="{ open, toggle }">
              <button v-tooltip="t('toolbar.insert')" type="button" class="wy-tool is-wide" :aria-label="t('toolbar.insert')" aria-haspopup="menu" :aria-expanded="open" @mousedown.prevent @click="toggle">
                <Plus :size="18" /><span class="wy-tool-text">{{ t("toolbar.insert") }}</span><ChevronDown :size="14" />
              </button>
            </template>
            <template #default="{ close }">
              <div v-for="g in groups" :key="g.group" role="group">
                <div class="wy-menu-heading">{{ g.label }}</div>
                <button
                  v-for="a in g.items"
                  :key="a.id"
                  type="button"
                  class="wy-menu-item"
                  role="menuitem"
                  :aria-disabled="(state.inCell && !a.inline) || !a.enabled(editor) || undefined"
                  :title="state.inCell && !a.inline ? t('editor.inlineOnly') : undefined"
                  @mousedown.prevent
                  @click="(!state.inCell || a.inline) && a.enabled(editor) && (a.run(editor), close())"
                >
                  <component :is="a.icon" v-if="a.icon" class="wy-menu-icon" :size="16" aria-hidden="true" />{{ a.label }}
                </button>
              </div>
            </template>
          </Dropdown>
          <button v-if="b.links" v-tooltip="{ text: t('toolbar.link'), keys: 'Mod-k' }" type="button" class="wy-tool" :aria-label="t('toolbar.link')" :aria-pressed="state.link" @mousedown.prevent @click="emit('link')"><LinkIcon :size="18" /></button>
          <button v-if="b.images && canUpload" v-tooltip="t('toolbar.image')" type="button" class="wy-tool" :aria-label="t('toolbar.image')" @mousedown.prevent @click="ctx.files.pick('image')"><Image :size="18" /></button>
          <button v-if="b.files && canUpload" v-tooltip="t('toolbar.file')" type="button" class="wy-tool" :aria-label="t('toolbar.file')" @mousedown.prevent @click="ctx.files.pick('file')"><Paperclip :size="18" /></button>
          <button
            v-for="item in ctx.toolbar"
            :key="item.id"
            v-tooltip="{ text: ctx.text(item.label), keys: item.shortcut }"
            type="button"
            class="wy-tool"
            :aria-label="ctx.text(item.label)"
            :aria-pressed="item.active?.(editor) ?? undefined"
            :disabled="item.enabled ? !item.enabled(editor) : false"
            @mousedown.prevent
            @click="item.run(editor, ctx.services)"
          >
            <component :is="item.icon" :size="18" />
          </button>
        </div>
      </template>
    </div>
    <div class="wy-toolbar-end">
      <slot name="status" />
      <div v-if="fullscreen && $slots.actions" class="wy-group wy-toolbar-actions"><slot name="actions" /></div>
      <div class="wy-group">
        <button v-if="showSource" v-tooltip="mode === 'source' ? t('toolbar.visual') : t('toolbar.source')" type="button" class="wy-tool" :aria-label="t('toolbar.source')" :aria-pressed="mode === 'source'" @mousedown.prevent @click="emit('set-mode', mode === 'source' ? 'visual' : 'source')"><FileCode :size="18" /></button>
        <button v-if="showFocus" v-tooltip="fullscreen ? t('toolbar.exitFocus') : t('toolbar.focus')" type="button" class="wy-tool" :aria-label="fullscreen ? t('toolbar.exitFocus') : t('toolbar.focus')" :aria-pressed="fullscreen" @mousedown.prevent @click="emit('toggle-fullscreen')">
          <Minimize2 v-if="fullscreen" :size="18" /><Maximize2 v-else :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>
