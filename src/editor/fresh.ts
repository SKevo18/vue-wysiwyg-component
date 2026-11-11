import type { Editor, JSONContent, Range } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

let freshType: string | null = null;

export function markFresh(typeName: string) {
  freshType = typeName;
}

export function takeFresh(typeName: string): boolean {
  if (freshType !== typeName) return false;
  freshType = null;
  return true;
}

export function insertFresh(editor: Editor, type: string, attrs: Record<string, unknown> = {}, range?: Range, content?: JSONContent[]) {
  markFresh(type);
  try {
    const chain = editor.chain().focus();
    if (range) chain.deleteRange(range);
    const inserted = !!editor.schema.nodes[type] && chain.insertContent(content ? { type, attrs, content } : { type, attrs }).run();
    // a view that edits on insert took the mark while it mounted; an atom nobody edits must not stay selected, or typing replaces it
    if (takeFresh(type) && inserted) caretAfterAtom(editor);
  } catch (e) {
    takeFresh(type);
    throw e;
  }
}

/** a selected block atom hands the caret to the paragraph after it, which is created when there is none */
function caretAfterAtom(editor: Editor) {
  const { state, view } = editor;
  const sel = state.selection;
  const $after = state.doc.resolve(sel.to);
  const atom = $after.nodeBefore;
  if (!atom?.isAtom || !atom.isBlock) return;
  const tr = state.tr;
  const next = $after.nodeAfter;
  if (!next?.isTextblock) tr.insert(sel.to, state.schema.nodes.paragraph!.create());
  tr.setSelection(TextSelection.create(tr.doc, sel.to + 1));
  view.dispatch(tr);
}
