// mermaid loads on first use; plantuml goes to the host's renderer or a plantuml server as an <img>, so no foreign svg runs in the page
export const PLANTUML_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

/** plantuml's text encoding: raw deflate of the utf-8 source in its own base64 alphabet */
export async function plantumlEncode(source: string): Promise<string> {
  const stream = new Blob([new TextEncoder().encode(source)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]!;
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    out += PLANTUML_ALPHABET[b1 >> 2]! + PLANTUML_ALPHABET[((b1 & 0x3) << 4) | (b2 >> 4)]! + PLANTUML_ALPHABET[((b2 & 0xf) << 2) | (b3 >> 6)]! + PLANTUML_ALPHABET[b3 & 0x3f]!;
  }
  return out;
}

export async function plantumlUrl(server: string, source: string): Promise<string> {
  return `${server}/svg/${await plantumlEncode(source)}`;
}

function luminance(color: string): number | null {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
  let rgb: number[] | null = null;
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color);
    if (m) rgb = [m[1], m[2], m[3]].map(Number);
  }
  return rgb ? (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255 : null;
}

/** dark when the editor's `--vc-bg` (or the page background) is dark */
export function isDarkTheme(el: Element | null): boolean {
  if (typeof document === "undefined") return false;
  const target = el ?? document.documentElement;
  const style = getComputedStyle(target);
  const l = luminance(style.getPropertyValue("--vc-bg")) ?? luminance(getComputedStyle(document.body).backgroundColor);
  if (l !== null) return l < 0.5;
  return style.colorScheme === "dark" || document.documentElement.classList.contains("dark");
}

/** calls `fn` when the host switches its theme (class, style or color scheme) */
export function watchTheme(fn: () => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(fn);
  const opts = { attributes: true, attributeFilter: ["class", "style", "data-theme"] };
  observer.observe(document.documentElement, opts);
  if (document.body) observer.observe(document.body, opts);
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  media?.addEventListener("change", fn);
  return () => {
    observer.disconnect();
    media?.removeEventListener("change", fn);
  };
}

interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  parse(text: string): Promise<unknown>;
  render(id: string, text: string): Promise<{ svg: string }>;
}

let mermaid: Promise<MermaidApi> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let counter = 0;

/** renders one diagram at a time: mermaid keeps its configuration and scratch elements global */
export function renderMermaid(source: string, dark: boolean): Promise<string> {
  mermaid ??= import("mermaid").then((m) => m.default as unknown as MermaidApi);
  const job = queue.then(async () => {
    const api = await mermaid!;
    api.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default", fontFamily: "inherit" });
    const id = `wy-mermaid-${++counter}`;
    try {
      await api.parse(source);
      return (await api.render(id, source)).svg;
    } finally {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    }
  });
  queue = job.catch(() => undefined);
  return job;
}
