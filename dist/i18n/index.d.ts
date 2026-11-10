import { type Messages } from "./en";
export type { Messages };
export type Locale = "en" | "sk";
export declare const MESSAGES: Record<Locale, Messages>;
export type Translate = (key: string, params?: Record<string, string | number>) => string;
export declare function hasMessage(trees: readonly unknown[], key: string): boolean;
export declare function createTranslator(trees: readonly unknown[]): Translate;
