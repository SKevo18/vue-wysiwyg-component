import { type App, type InjectionKey, type ShallowRef } from "vue";
import type { Locale } from "./i18n";
import type { BaseOptions, DeepPartial, EditorExtension, EditorHandle, EditorServices } from "./types";
import type { Messages } from "./i18n";
export interface WysiwygDefaults {
    services?: EditorServices;
    locale?: Locale;
    messages?: DeepPartial<Messages> & Record<string, unknown>;
    base?: BaseOptions;
    extensions?: readonly EditorExtension[];
}
export declare const WYSIWYG_DEFAULTS: InjectionKey<WysiwygDefaults>;
export declare function createWysiwyg(defaults?: WysiwygDefaults): {
    install(app: App): void;
};
interface HandleRegistry {
    register(handle: EditorHandle): () => void;
    activate(handle: EditorHandle): void;
}
export declare const HANDLE_REGISTRY: InjectionKey<HandleRegistry>;
/** editor last focused (or first mounted) among this component's descendants; nested fields inside node views do not count. */
export declare function useEditorHandle(): ShallowRef<EditorHandle | null>;
export declare function useHandleRegistry(): HandleRegistry | null;
export {};
