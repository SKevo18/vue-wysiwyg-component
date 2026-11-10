import type { Editor } from "@tiptap/core";
import type { EditorConfig } from "../schema";
import type { Translate } from "../i18n";
import type { EditorServices } from "../types";
import type { FileController } from "./context";
export declare function fitWithin(width: number, height: number, max: number): {
    width: number;
    height: number;
} | null;
/** png keeps transparency, everything else becomes jpeg (quality 0.85); gifs stay as they are, nothing is upscaled */
export declare function downscaleImage(file: File, max: number): Promise<File>;
interface FileControllerOptions {
    editor(): Editor | null | undefined;
    config: EditorConfig;
    services: EditorServices;
    t: Translate;
    locale: string;
    progress(count: number, fraction: number | null): void;
}
export declare function createFileController(o: FileControllerOptions): FileController;
export {};
