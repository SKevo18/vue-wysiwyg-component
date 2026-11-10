// katex comes from the app loader (`services.katex`) so apps without math never bundle it; formulas show as TeX source until it loads
import { shallowRef } from "vue";
import { escapeHtml } from "./highlight";

export interface KatexLike {
  renderToString(tex: string, options?: Record<string, unknown>): string;
}

export type KatexLoader = () => Promise<KatexLike | { default: KatexLike }>;

const katex = shallowRef<KatexLike | null>(null);
let loader: KatexLoader | null = null;
let loading: Promise<void> | null = null;
const cache = new Map<string, string>();

export function setKatexLoader(load: KatexLoader | undefined) {
  if (load && !loader) loader = load;
}

function load() {
  if (!loader || loading) return;
  loading = loader().then(
    (m) => {
      katex.value = "renderToString" in m ? m : m.default;
    },
    (e: unknown) => console.error("vue-wysiwyg-component: services.katex failed to load KaTeX", e),
  );
}

export function renderMath(tex: string, display: boolean): string {
  const k = katex.value;
  if (!k) {
    load();
    return `<code class="wy-math-source">${escapeHtml(tex)}</code>`;
  }
  const key = `${display ? "D" : "I"}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let html: string;
  try {
    html = k.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
  } catch {
    html = `<code class="wy-math-error">${escapeHtml(tex)}</code>`;
  }
  cache.set(key, html);
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return html;
}
