// Section containers (tabs) whose children are one `==== label` section each, as in poznamkovac's notes: the
// section node, which tab is shown, and the section operations (select, add, remove, move, relabel).
//
// The shown tab follows the caret: whenever the selection lands in a tab (click, arrow keys, undo, a tab button),
// that tab becomes the active one of its container. The plugin state maps container positions to that index; the
// views read it on every transaction (a node view is not re-rendered when only the selection moved). Nothing of
// this touches the document, so switching tabs is neither an edit nor an undo step.
import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";

/** a section (a tab): `label` is the text after `==== `. isolating, so Backspace never merges two sections */
export function sectionNode(name: string) {
  return Node.create({
    name,
    content: "block+",
    defining: true,
    isolating: true,
    addAttributes() {
      return {
        label: {
          default: "",
          parseHTML: (dom: HTMLElement) => dom.getAttribute("data-label") ?? "",
          renderHTML: (a: { label?: string }) => ({ "data-label": a.label ?? "" }),
        },
      };
    },
    parseHTML() {
      return [{ tag: `div[data-${name}]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["div", mergeAttributes({ [`data-${name}`]: "" }, HTMLAttributes), 0];
    },
  });
}

/** position of a container -> index of its shown section */
type Active = Map<number, number>;

const key = new PluginKey<Active>("sectionsActive");

/** records the section holding the selection head (at every nesting level) as its container's active one */
function followSelection(state: EditorState, active: Active, child: string): boolean {
  const $head = state.selection.$head;
  let changed = false;
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).type.name !== child) continue;
    const pos = $head.before(d - 1);
    const index = $head.index(d - 1);
    if (active.get(pos) !== index) {
      active.set(pos, index);
      changed = true;
    }
  }
  return changed;
}

export const TabsActive = Extension.create({
  name: "tabsActive",
  addProseMirrorPlugins() {
    return [
      new Plugin<Active>({
        key,
        state: {
          init: (_, state) => {
            const active: Active = new Map();
            followSelection(state, active, "tab");
            return active;
          },
          apply: (tr: Transaction, prev, _old, state) => {
            if (!tr.docChanged && !tr.selectionSet) return prev;
            const active: Active = new Map();
            for (const [pos, index] of prev) {
              const r = tr.mapping.mapResult(pos, 1);
              if (!r.deleted) active.set(r.pos, index);
            }
            return followSelection(state, active, "tab") || tr.docChanged ? active : prev;
          },
        },
      }),
    ];
  },
});

/** index of the shown section of the container at `pos`, clamped to its children */
export function activeSection(state: EditorState, pos: number): number {
  const node = state.doc.nodeAt(pos);
  return Math.min(key.getState(state)?.get(pos) ?? 0, Math.max(0, (node?.childCount ?? 1) - 1));
}

/** start position of child `index` of the container at `pos` in `doc`, or -1 */
function childStart(doc: PMNode, pos: number, index: number): number {
  const parent = doc.nodeAt(pos);
  if (!parent || index < 0 || index >= parent.childCount) return -1;
  let start = pos + 1;
  for (let i = 0; i < index; i++) start += parent.child(i).nodeSize;
  return start;
}

/** caret at the start of section `index` of the container at `pos` (this shows the tab) */
function caretInto(tr: Transaction, pos: number, index: number): Transaction {
  const start = childStart(tr.doc, pos, index);
  return start < 0 ? tr : tr.setSelection(TextSelection.near(tr.doc.resolve(start + 1))).scrollIntoView();
}

export function selectSection(editor: Editor, pos: number, index: number) {
  editor.view.dispatch(caretInto(editor.state.tr, pos, index));
  editor.view.focus();
}

export function setSectionLabel(editor: Editor, pos: number, index: number, label: string) {
  const start = childStart(editor.state.doc, pos, index);
  const child = start < 0 ? null : editor.state.doc.nodeAt(start);
  if (child) editor.view.dispatch(editor.state.tr.setNodeMarkup(start, undefined, { ...child.attrs, label }));
}

/** an empty section at `index` (0..childCount) with the caret in it */
export function addSection(editor: Editor, pos: number, index: number) {
  const parent = editor.state.doc.nodeAt(pos);
  const section = parent?.type.contentMatch.defaultType?.createAndFill();
  if (!parent || !section) return;
  const at = index < parent.childCount ? childStart(editor.state.doc, pos, index) : pos + parent.nodeSize - 1;
  editor.view.dispatch(caretInto(editor.state.tr.insert(at, section), pos, index));
  editor.view.focus();
}

/** removes section `index` unless it is the last one; the caret moves to the neighbour */
export function removeSection(editor: Editor, pos: number, index: number) {
  const parent = editor.state.doc.nodeAt(pos);
  const start = childStart(editor.state.doc, pos, index);
  if (!parent || start < 0 || parent.childCount < 2) return;
  const tr = editor.state.tr.delete(start, start + parent.child(index).nodeSize);
  editor.view.dispatch(caretInto(tr, pos, Math.min(index, parent.childCount - 2)));
}

/** swaps section `index` with its neighbour in direction `dir`; the caret follows the moved section */
export function moveSection(editor: Editor, pos: number, index: number, dir: -1 | 1) {
  const first = Math.min(index, index + dir);
  const parent = editor.state.doc.nodeAt(pos);
  const start = childStart(editor.state.doc, pos, first);
  if (!parent || start < 0 || first + 1 >= parent.childCount) return;
  const a = parent.child(first);
  const b = parent.child(first + 1);
  const tr = editor.state.tr.replaceWith(start, start + a.nodeSize + b.nodeSize, [b, a]);
  editor.view.dispatch(caretInto(tr, pos, index + dir));
}
