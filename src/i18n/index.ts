import { en, type Messages } from "./en";
import { sk } from "./sk";

export type { Messages };
export type Locale = "en" | "sk";

export const MESSAGES: Record<Locale, Messages> = { en, sk };

export type Translate = (key: string, params?: Record<string, string | number>) => string;

function lookup(tree: unknown, path: string[]): string | undefined {
  let cur: unknown = tree;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = Reflect.get(cur, p);
  }
  return typeof cur === "string" ? cur : undefined;
}

export function hasMessage(trees: readonly unknown[], key: string): boolean {
  const path = key.split(".");
  return trees.some((t) => lookup(t, path) !== undefined);
}

export function createTranslator(trees: readonly unknown[]): Translate {
  return (key, params) => {
    const path = key.split(".");
    let text: string | undefined;
    for (const t of trees) {
      text = lookup(t, path);
      if (text !== undefined) break;
    }
    if (text === undefined) return key;
    return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;
  };
}
