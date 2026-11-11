import { Extension, type Editor } from "@tiptap/core";
import { type Component, type InjectionKey } from "vue";
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
    /** shows an image enlarged over the page */
    zoom(image: {
        src: string;
        alt: string;
    }): void;
}
declare module "@tiptap/core" {
    interface Storage {
        wysiwyg: {
            context: EditorContext | null;
        };
    }
}
export declare const ContextStorage: Extension<{
    context: EditorContext | null;
}, {
    context: EditorContext | null;
}>;
export declare const EDITOR_CONTEXT: InjectionKey<EditorContext>;
export declare function contextOf(editor: Editor): EditorContext;
export declare function useEditorContext(): EditorContext;
