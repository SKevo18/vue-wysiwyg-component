import { inject, provide, shallowRef, type App, type InjectionKey, type ShallowRef } from "vue";
import type { Locale } from "./i18n";
import type { BaseOptions, DeepPartial, EditorExtension, EditorHandle, EditorServices } from "./types";
import type { Messages } from "./i18n";
import { vTooltip } from "./components/tooltip";

export interface WysiwygDefaults {
  services?: EditorServices;
  locale?: Locale;
  messages?: DeepPartial<Messages> & Record<string, unknown>;
  base?: BaseOptions;
  extensions?: readonly EditorExtension[];
}

export const WYSIWYG_DEFAULTS: InjectionKey<WysiwygDefaults> = Symbol("wysiwyg-defaults");

export function createWysiwyg(defaults: WysiwygDefaults = {}) {
  return {
    install(app: App) {
      app.provide(WYSIWYG_DEFAULTS, defaults);
      app.directive("tooltip", vTooltip);
    },
  };
}

interface HandleRegistry {
  register(handle: EditorHandle): () => void;
  activate(handle: EditorHandle): void;
}

export const HANDLE_REGISTRY: InjectionKey<HandleRegistry> = Symbol("wysiwyg-handles");

/** editor last focused (or first mounted) among this component's descendants; nested fields inside node views do not count. */
export function useEditorHandle(): ShallowRef<EditorHandle | null> {
  const current = shallowRef<EditorHandle | null>(null);
  const mounted: EditorHandle[] = [];
  provide(HANDLE_REGISTRY, {
    register(handle) {
      mounted.push(handle);
      current.value ??= handle;
      return () => {
        mounted.splice(mounted.indexOf(handle), 1);
        if (current.value === handle) current.value = mounted[mounted.length - 1] ?? null;
      };
    },
    activate(handle) {
      current.value = handle;
    },
  });
  return current;
}

export function useHandleRegistry(): HandleRegistry | null {
  return inject(HANDLE_REGISTRY, null);
}
