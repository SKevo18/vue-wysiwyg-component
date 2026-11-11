import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { BLOCK_COLOR_TYPES } from "../schema/colors";
import type { BlockRun } from "./convert";

const ITEMS: Record<string, true> = { listItem: true, taskItem: true };

function colorable(node: PMNode): boolean {
  return BLOCK_COLOR_TYPES.includes(node.type.name) && "color" in (node.type.spec.attrs ?? {});
}

/**
 * where a block colour of the run lands: each colourable block; inside a list or table, its items or cells; a first
 * child of a list item colours the item, as the markdown writes it
 */
export function colorTargets(state: EditorState, run: BlockRun): number[] {
  const out: number[] = [];
  const visit = (node: PMNode, pos: number) => {
    if (colorable(node)) {
      if (!out.includes(pos)) out.push(pos);
      return;
    }
    if (node.isTextblock || node.isLeaf) return;
    node.forEach((child, offset) => visit(child, pos + 1 + offset));
  };
  let pos = run.from;
  for (const node of run.nodes) {
    const $pos = state.doc.resolve(pos);
    if ($pos.depth > 0 && ITEMS[$pos.parent.type.name] === true && $pos.index() === 0 && colorable($pos.parent)) visit($pos.parent, $pos.before());
    else visit(node, pos);
    pos += node.nodeSize;
  }
  return out;
}

export function blockColorOf(state: EditorState, run: BlockRun): string {
  const first = colorTargets(state, run)[0];
  return first === undefined ? "" : String(state.doc.nodeAt(first)?.attrs.color ?? "");
}

export function setBlockColor(editor: Editor, run: BlockRun, token: string | null) {
  const tr = editor.state.tr;
  for (const pos of colorTargets(editor.state, run)) {
    const node = tr.doc.nodeAt(pos);
    if (node) tr.setNodeMarkup(pos, undefined, { ...node.attrs, color: token });
  }
  if (tr.docChanged) editor.view.dispatch(tr);
}
