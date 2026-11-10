import type { Editor } from "@tiptap/core";
import { Fragment, Slice, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { TextSelection, type EditorState } from "@tiptap/pm/state";
import { CellSelection, TableMap, moveTableColumn, moveTableRow } from "@tiptap/pm/tables";
import { flattenToParagraph } from "../schema/nodes";

export function isInCell($pos: ResolvedPos): boolean {
  for (let d = $pos.depth; d > 0; d--) {
    const role = $pos.node(d).type.spec.tableRole;
    if (role === "cell" || role === "header_cell") return true;
  }
  return false;
}

export function cellSlice(slice: Slice, state: EditorState): Slice {
  const role = slice.content.firstChild?.type.spec.tableRole;
  if (role === "table" || role === "row" || role === "cell" || role === "header_cell") return slice;
  return new Slice(Fragment.from(flattenToParagraph(slice.content, state.schema)), 1, 1);
}

export interface TableRef {
  pos: number;
  node: PMNode;
}

export type ColumnAlign = "left" | "center" | "right";

function cellPos(table: TableRef, row: number, col: number): number {
  const map = TableMap.get(table.node);
  return table.pos + 1 + map.map[row * map.width + col]!;
}

export function selectLine(editor: Editor, table: TableRef, kind: "col" | "row", index: number): boolean {
  const node = editor.state.doc.nodeAt(table.pos);
  if (!node || node.type.name !== "table") return false;
  const ref = { pos: table.pos, node };
  const map = TableMap.get(node);
  if (index >= (kind === "col" ? map.width : map.height)) return false;
  const $cell = editor.state.doc.resolve(kind === "col" ? cellPos(ref, 0, index) : cellPos(ref, index, 0));
  const sel = kind === "col" ? CellSelection.colSelection($cell) : CellSelection.rowSelection($cell);
  editor.view.dispatch(editor.state.tr.setSelection(sel));
  return true;
}

function caretIn(editor: Editor, tablePos: number, row: number, col: number) {
  const node = editor.state.doc.nodeAt(tablePos);
  if (!node) return;
  const pos = cellPos({ pos: tablePos, node }, row, col);
  const cell = editor.state.doc.nodeAt(pos)!;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos + cell.nodeSize - 1), -1)));
}

export type TableAction =
  | { kind: "col"; index: number; action: "before" | "after" | "delete" | ColumnAlign }
  | { kind: "row"; index: number; action: "before" | "after" | "delete" | "header" }
  | { kind: "table"; action: "addCol" | "addRow" | "delete" };

export function runTableAction(editor: Editor, table: TableRef, a: TableAction) {
  const map = TableMap.get(table.node);
  if (a.kind === "table") {
    if (a.action === "delete") {
      selectLine(editor, table, "row", 0);
      editor.chain().focus().deleteTable().run();
      return;
    }
    const col = a.action === "addCol";
    selectLine(editor, table, col ? "col" : "row", (col ? map.width : map.height) - 1);
    if (col) editor.chain().focus().addColumnAfter().run();
    else editor.chain().focus().addRowAfter().run();
    caretIn(editor, table.pos, col ? 0 : map.height, col ? map.width : 0);
    return;
  }
  if (!selectLine(editor, table, a.kind, a.index)) return;
  const chain = editor.chain().focus();
  const isCol = a.kind === "col";
  const count = isCol ? map.width : map.height;
  let target = a.index;
  switch (a.action) {
    case "delete":
      if (count === 1) {
        chain.deleteTable().run();
        return;
      }
      if (isCol) chain.deleteColumn().run();
      else chain.deleteRow().run();
      target = Math.min(a.index, count - 2);
      break;
    case "before":
      if (isCol) chain.addColumnBefore().run();
      else chain.addRowBefore().run();
      break;
    case "after":
      if (isCol) chain.addColumnAfter().run();
      else chain.addRowAfter().run();
      target = a.index + 1;
      break;
    case "header":
      chain.toggleHeaderRow().run();
      break;
    default:
      chain.setCellAttribute("align", a.action).run();
  }
  caretIn(editor, table.pos, isCol ? 0 : target, isCol ? target : 0);
}

/** the header row stays first: gfm writes it above the `---` line, so it neither moves nor gets displaced */
export function moveLine(editor: Editor, table: TableRef, kind: "col" | "row", from: number, to: number): boolean {
  if (from === to) return false;
  const node = editor.state.doc.nodeAt(table.pos);
  if (!node || node.type.name !== "table") return false;
  if (kind === "row" && hasHeaderRow(node) && (from === 0 || to === 0)) return false;
  // prosemirror-tables reads the row and column ranges from the selection, so it must sit in this table
  if (!selectLine(editor, table, kind, from)) return false;
  const move = kind === "col" ? moveTableColumn({ from, to, pos: table.pos + 1 }) : moveTableRow({ from, to, pos: table.pos + 1 });
  return move(editor.state, editor.view.dispatch);
}

export function hasHeaderRow(table: PMNode): boolean {
  let header = table.firstChild !== null && table.firstChild.childCount > 0;
  table.firstChild?.forEach((cell) => {
    if (cell.type.name !== "tableHeader") header = false;
  });
  return header;
}
