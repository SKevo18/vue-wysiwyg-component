import type { Content, Editor } from "@tiptap/core";
import { formatBytes, isImageSrc, mediaKind } from "../core/media";
import type { EditorConfig } from "../schema";
import type { Translate } from "../i18n";
import type { EditorServices, PickedFile, UploadResult } from "../types";
import type { FileController } from "./context";
import { markFresh, takeFresh } from "./fresh";
import { isInCell } from "./tables";

const QUALITY = 0.85;
const SCALABLE: Record<string, true> = { "image/png": true, "image/jpeg": true, "image/webp": true };

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } | null {
  const side = Math.max(width, height);
  if (side <= max) return null;
  const scale = max / side;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function renamed(name: string, type: string): string {
  const ext = type === "image/png" ? "png" : "jpg";
  const base = name.replace(/\.[^./]+$/, "") || "image";
  const current = /\.([^./]+)$/.exec(name)?.[1]?.toLowerCase();
  if (current === ext || (ext === "jpg" && current === "jpeg")) return name;
  return `${base}.${ext}`;
}

function hasAlpha(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true;
  return false;
}

/** png keeps transparency, everything else becomes jpeg (quality 0.85); gifs stay as they are, nothing is upscaled */
export async function downscaleImage(file: File, max: number): Promise<File> {
  if (!SCALABLE[file.type] || typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const size = fitWithin(bitmap.width, bitmap.height, max);
    if (!size) return file;
    const canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const alpha = file.type !== "image/jpeg" && hasAlpha(ctx.getImageData(0, 0, size.width, size.height).data);
    const type = alpha ? "image/png" : "image/jpeg";
    const blob = await canvas.convertToBlob(alpha ? { type } : { type, quality: QUALITY });
    if (blob.type !== type) return file;
    return new File([blob], renamed(file.name, type), { type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

interface FileControllerOptions {
  editor(): Editor | null | undefined;
  config: EditorConfig;
  services: EditorServices;
  t: Translate;
  locale: string;
  progress(count: number, fraction: number | null): void;
}

function chooseLocal(kind: "image" | "file", multiple: boolean): Promise<File[]> {
  const { promise, resolve } = Promise.withResolvers<File[]>();
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  if (kind === "image") input.accept = "image/*";
  input.addEventListener("change", () => resolve(Array.from(input.files ?? [])), { once: true });
  input.addEventListener("cancel", () => resolve([]), { once: true });
  input.click();
  return promise;
}

function isImage(up: UploadResult): boolean {
  return up.type.startsWith("image/") || up.type.startsWith("video/") || up.type.startsWith("audio/") || isImageSrc(up.url) || isImageSrc(up.name) || !!mediaKind(up.url);
}

export function createFileController(o: FileControllerOptions): FileController {
  const b = o.config.base;

  function at(editor: Editor, pos: number | null | undefined): number | null {
    return pos === null || pos === undefined || pos > editor.state.doc.content.size ? null : pos;
  }

  function insertNodes(editor: Editor, content: Content, pos: number | null): boolean {
    const chain = editor.chain().focus();
    return pos === null ? chain.insertContent(content).run() : chain.insertContentAt(pos, content).run();
  }

  function insertResult(up: UploadResult, pos: number | null) {
    const editor = o.editor();
    if (!editor) return;
    const p = at(editor, pos);
    const schema = editor.schema;
    const alt = up.name.replace(/\.[^.]+$/, "") || null;
    if (b.images && isImage(up) && (schema.nodes.figure || schema.nodes.image)) {
      const $pos = p === null ? editor.state.selection.$from : editor.state.doc.resolve(p);
      const inline = !schema.nodes.figure || isInCell($pos) || schema.topNodeType.spec.content === "paragraph";
      if (inline) {
        insertNodes(editor, { type: "image", attrs: { src: up.url, alt } }, p);
      } else {
        markFresh("figure");
        if (!insertNodes(editor, { type: "figure", attrs: { src: up.url, alt, align: o.config.format === "markdown" ? "center" : null } }, p)) takeFresh("figure");
      }
      return;
    }
    if (!schema.marks.link) return;
    const title = b.files && up.size !== undefined ? formatBytes(up.size, o.locale) : null;
    insertNodes(editor, [{ type: "text", text: up.name, marks: [{ type: "link", attrs: { href: up.url, title } }] }, { type: "text", text: " " }], p);
  }

  const aborter = new AbortController();
  const inFlight = new Map<number, number | null>();
  let nextId = 0;

  function report() {
    const known = [...inFlight.values()].filter((f) => f !== null);
    o.progress(inFlight.size, known.length ? known.reduce((a, b) => a + b, 0) / known.length : null);
  }

  async function upload(file: File): Promise<UploadResult> {
    const send = o.services.upload;
    if (!send) throw new Error("no upload service");
    const id = nextId++;
    inFlight.set(id, null);
    report();
    try {
      const prepared = b.downscale && file.type.startsWith("image/") ? await downscaleImage(file, b.downscale) : file;
      const onProgress = (fraction: number) => {
        if (!inFlight.has(id)) return;
        inFlight.set(id, Math.min(1, Math.max(0, fraction)));
        report();
      };
      return await send(prepared, { onProgress, signal: aborter.signal });
    } finally {
      inFlight.delete(id);
      report();
    }
  }

  async function uploadAndInsert(file: File, pos: number | null) {
    try {
      const up = await upload(file);
      if (!aborter.signal.aborted) insertResult(up, pos);
    } catch {
      if (!aborter.signal.aborted) o.services.toast?.(o.t("editor.uploadFailed", { name: file.name }), "error");
    }
  }

  function accepts(file: PickedFile): boolean {
    const type = file.type;
    const image = type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/");
    return image ? b.images || b.files : b.files;
  }

  function insert(files: readonly PickedFile[], pos: number | null = null): boolean {
    const list = files.filter(accepts);
    if (!list.length || (list.some((f) => f instanceof File) && !o.services.upload)) return false;
    for (const f of list) {
      if (f instanceof File) void uploadAndInsert(f, pos);
      else insertResult(f, pos);
    }
    return true;
  }

  async function choose(kind: "image" | "file", multiple = true): Promise<PickedFile[]> {
    return (o.services.pickFile ? await o.services.pickFile(kind) : await chooseLocal(kind, multiple)) ?? [];
  }

  async function pick(kind: "image" | "file", pos: number | null = null) {
    const picked = await choose(kind);
    if (picked.length) insert(picked, pos);
  }

  return { pick, choose, insert, upload, dispose: () => aborter.abort() };
}
