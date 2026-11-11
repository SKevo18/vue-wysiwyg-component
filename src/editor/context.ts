import { Extension, type Editor } from "@tiptap/core";
import { inject, type Component, type InjectionKey } from "vue";
import type { MarkdownConverter } from "../markdown";
import type { EditorConfig } from "../schema";
import type { Locale, Translate } from "../i18n";
import type { CodeBlockHooks, FigureHooks, MathHooks, EditorServices, EditorSize, MaybeText, PickedFile, SlashItem, ToolItemDef, UploadResult } from "../types";
import type { ConvertRegistry } from "./convert";
import type { WysiwygDefaults } from "../plugin";

export interface FileController {
  pick(kind: "image" | "file", pos?: number | null): Promise<void>;
  choose(kind: "image" | "file", multiple?: boolean): Promise<PickedFile[]>;
  insert(files: readonly PickedFile[], pos?: number | null): boolean;
  upload(file: File): Promise<UploadResult>;
  dispose(): void;
}

/** what the lightbox shows: an image url, or sanitized svg markup (a rendered mermaid diagram) */
export interface ZoomImage {
  src: string;
  alt: string;
  svg?: string;
}

export interface EditorContext {
  config: EditorConfig;
  markdown: MarkdownConverter;
  convert: ConvertRegistry;
  services: EditorServices;
  t: Translate;
  locale: Locale;
  size: EditorSize;
  inline: boolean;
  slashItems: SlashItem[];
  toolbar: ToolItemDef[];
  bubble: ToolItemDef[];
  codeBlock: CodeBlockHooks[];
  figure: FigureHooks[];
  math: MathHooks[];
  files: FileController;
  /** text of a label; the message under `fallbackKey` when the label is empty, "" when that message is missing too */
  text(label: MaybeText | undefined, fallbackKey?: string): string;
  has(key: string): boolean;
  field: Component;
  inherit: WysiwygDefaults;
  /** shows an image or a diagram enlarged over the page */
  zoom(image: ZoomImage): void;
}

declare module "@tiptap/core" {
  interface Storage {
    wysiwyg: { context: EditorContext | null };
  }
}

export const ContextStorage = Extension.create<{ context: EditorContext | null }, { context: EditorContext | null }>({
  name: "wysiwyg",
  addOptions() {
    return { context: null };
  },
  addStorage() {
    return { context: this.options.context };
  },
});

export const EDITOR_CONTEXT: InjectionKey<EditorContext> = Symbol("wysiwyg-context");

export function contextOf(editor: Editor): EditorContext {
  const ctx = editor.storage.wysiwyg?.context;
  if (!ctx) throw new Error("not a wysiwyg editor");
  return ctx;
}

export function useEditorContext(): EditorContext {
  const ctx = inject(EDITOR_CONTEXT, null);
  if (!ctx) throw new Error("useEditorContext() needs a WysiwygEditor ancestor");
  return ctx;
}
