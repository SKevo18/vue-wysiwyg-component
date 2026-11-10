import type { LanguageFn } from "highlight.js";
export declare const CODE_LANGUAGES: readonly string[];
export declare function escapeHtml(s: string): string;
export declare function registerCodeLanguage(name: string, language: LanguageFn, aliases?: string[]): void;
export declare function highlightCode(code: string, lang: string): string;
