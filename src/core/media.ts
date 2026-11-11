export const FIGURE_ALIGNS = ["left", "center", "right", "float-left", "float-right"] as const;
export type FigureAlign = (typeof FIGURE_ALIGNS)[number];

export interface ImageAttrs {
  /** percent of the column, 10..100; null = natural width capped at the column */
  width: number | null;
  align: FigureAlign | null;
}

export function parseImageAttrs(body: string): ImageAttrs | null {
  const attrs: ImageAttrs = { width: null, align: null };
  let any = false;
  for (const part of body.trim().split(/\s+/)) {
    const m = /^(width|align)=(.+)$/.exec(part);
    if (!m) continue;
    if (m[1] === "width") {
      const n = /^(\d+)%?$/.exec(m[2]!);
      if (!n) continue;
      attrs.width = Math.min(100, Math.max(10, parseInt(n[1]!, 10)));
      any = true;
    } else if ((FIGURE_ALIGNS as readonly string[]).includes(m[2]!)) {
      attrs.align = m[2] as FigureAlign;
      any = true;
    }
  }
  return any ? attrs : null;
}

export function formatImageAttrs(attrs: Partial<ImageAttrs>): string {
  const parts: string[] = [];
  if (attrs.width && attrs.width !== 100) parts.push(`width=${attrs.width}%`);
  if (attrs.align) parts.push(`align=${attrs.align}`);
  return parts.length ? `{${parts.join(" ")}}` : "";
}

export function shownAlign(align: FigureAlign | null, caption: string | null | undefined): FigureAlign {
  return align ?? (caption ? "center" : "left");
}

export const DIAGRAM_ALIGNS = ["left", "center", "right"] as const;
export type DiagramAlign = (typeof DIAGRAM_ALIGNS)[number];

/** a diagram's size and place, kept in the code fence info after the language: ```mermaid width=60 align=center */
export interface DiagramLayout {
  /** percent of the column, 10..100; null = the full column */
  width: number | null;
  align: DiagramAlign | null;
}

const LAYOUT_RE = /(?:^|\s)(width|align)=(\S+)/g;

export function diagramLayout(meta: string): DiagramLayout {
  const out: DiagramLayout = { width: null, align: null };
  for (const [, key, value] of meta.matchAll(LAYOUT_RE)) {
    if (key === "width") {
      const n = /^(\d+)%?$/.exec(value!);
      if (n) out.width = Math.min(100, Math.max(10, parseInt(n[1]!, 10)));
    } else if ((DIAGRAM_ALIGNS as readonly string[]).includes(value!)) out.align = value as DiagramAlign;
  }
  if (out.width === 100) out.width = null;
  return out;
}

/** the fence info `meta` with the layout replaced; other words of the info stay as they were */
export function withDiagramLayout(meta: string, layout: DiagramLayout): string {
  const rest = meta.replace(LAYOUT_RE, "").trim();
  const parts = [...(layout.width && layout.width !== 100 ? [`width=${layout.width}`] : []), ...(layout.align ? [`align=${layout.align}`] : [])];
  return [...parts, rest].filter(Boolean).join(" ");
}

type MediaKind = "video" | "audio";
const MEDIA_EXTS: Record<string, MediaKind> = { mp4: "video", webm: "video", mov: "video", mp3: "audio", ogg: "audio", wav: "audio", m4a: "audio" };
const IMAGE_EXT_RE = /^(png|jpe?g|gif|webp|svg|avif|bmp|tiff?)$/;

function fileExt(src: string): string {
  const clean = src.split(/[?#]/)[0]!;
  const m = /\.([a-z0-9]{1,16})$/i.exec(clean);
  return m ? m[1]!.toLowerCase() : "";
}

export function mediaKind(src: string): MediaKind | null {
  return MEDIA_EXTS[fileExt(src)] ?? null;
}

export function isImageSrc(src: string): boolean {
  return IMAGE_EXT_RE.test(fileExt(src));
}

export const SIZE_RE = /^\d+([.,]\d+)?\s?(B|kB|KB|MB|GB)$/;

export function formatBytes(bytes: number, locale = "en"): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return kb < 1024 ? `${fmt.format(kb)} kB` : `${fmt.format(kb / 1024)} MB`;
}
