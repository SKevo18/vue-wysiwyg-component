import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import rust from "highlight.js/lib/languages/rust";
import csharp from "highlight.js/lib/languages/csharp";
import php from "highlight.js/lib/languages/php";
import lua from "highlight.js/lib/languages/lua";
import ruby from "highlight.js/lib/languages/ruby";

for (const [name, lang] of Object.entries({ python, javascript, typescript, sql, bash, c, cpp, java, go, json, xml, css, yaml, markdown, plaintext, rust, csharp, php, lua, ruby })) {
  hljs.registerLanguage(name, lang);
}
hljs.registerAliases(["py"], { languageName: "python" });
hljs.registerAliases(["js", "mjs"], { languageName: "javascript" });
hljs.registerAliases(["ts"], { languageName: "typescript" });
hljs.registerAliases(["sh", "shell", "zsh"], { languageName: "bash" });
hljs.registerAliases(["html", "svg", "xhtml"], { languageName: "xml" });
hljs.registerAliases(["yml"], { languageName: "yaml" });
hljs.registerAliases(["md"], { languageName: "markdown" });
hljs.registerAliases(["txt", "text"], { languageName: "plaintext" });
hljs.registerAliases(["cs"], { languageName: "csharp" });
hljs.registerAliases(["c++"], { languageName: "cpp" });

export const CODE_LANGUAGES: readonly string[] = Object.freeze(["python", "javascript", "typescript", "html", "css", "sql", "bash", "json", "yaml", "markdown", "c", "cpp", "java", "go", "rust", "php", "ruby", "lua", "text"]);

const CACHE_SIZE = 200;
const cache = new Map<string, string>();

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function registerCodeLanguage(name: string, language: LanguageFn, aliases: string[] = []) {
  hljs.registerLanguage(name, language);
  if (aliases.length) hljs.registerAliases(aliases, { languageName: name });
  cache.clear();
}

export function highlightCode(code: string, lang: string): string {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const key = `${language}\n${code}`;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let value: string;
  try {
    value = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    value = escapeHtml(code);
  }
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return value;
}
