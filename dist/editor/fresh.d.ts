import type { Editor, JSONContent, Range } from "@tiptap/core";
export declare function markFresh(typeName: string): void;
export declare function takeFresh(typeName: string): boolean;
export declare function insertFresh(editor: Editor, type: string, attrs?: Record<string, unknown>, range?: Range, content?: JSONContent[]): void;
