import type { Editor, JSONContent, Range } from "@tiptap/core";

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
    if (!inserted) takeFresh(type);
  } catch (e) {
    takeFresh(type);
    throw e;
  }
}
