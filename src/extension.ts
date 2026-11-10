import { Node, mergeAttributes } from "@tiptap/core";
import type { Component } from "vue";
import { newBlockId, type FenceInfo } from "./core/info";
import type { ConvertHooks, EditorExtension, EditorFormat, MaybeText, SlashItemDef } from "./types";

export function defineEditorExtension(extension: EditorExtension): EditorExtension {
  return extension;
}

function readAttrs(dom: HTMLElement): Record<string, string> {
  let v: unknown;
  try {
    v = JSON.parse(dom.getAttribute("data-attrs") || "{}");
  } catch {
    return {};
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const valid = (e: [string, unknown]): e is [string, string] => /^[^\s"=`]+$/.test(e[0]) && typeof e[1] === "string" && !/[\r\n]/.test(e[1]);
  return Object.fromEntries(Object.entries(v).filter(valid));
}

/** never `draggable` (the gutter grip drags blocks), so the caret can enter inputs of its node view. */
export function fenceAtom(name: string, kind: string) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: false,
    selectable: true,
    addAttributes() {
      return {
        attrs: {
          default: {},
          parseHTML: readAttrs,
          renderHTML: (a: { attrs: Record<string, string> }) => ({ "data-attrs": JSON.stringify(a.attrs ?? {}) }),
        },
        body: {
          default: "",
          parseHTML: (dom: HTMLElement) => dom.getAttribute("data-body") ?? "",
          renderHTML: (a: { body: string }) => ({ "data-body": a.body ?? "" }),
        },
      };
    },
    parseHTML() {
      return [{ tag: `div[data-fence="${kind}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["div", mergeAttributes({ "data-fence": kind }, HTMLAttributes), kind];
    },
  });
}

export interface FenceBlockOptions {
  kind: string;
  /** default `<kind>Block` */
  node?: string;
  match?: (info: FenceInfo) => boolean;
  ensureId?: boolean;
  view?: Component;
  slash?: Omit<SlashItemDef, "run" | "id"> & { id?: string; attrs?: Record<string, string>; body?: string };
  convert?: ConvertHooks;
  formats?: EditorFormat[];
  messages?: EditorExtension["messages"];
}

/** parse and serialize keep fence attributes and body byte for byte. */
export function defineFenceBlock(options: FenceBlockOptions): EditorExtension {
  const name = options.node ?? `${options.kind}Block`;
  const slash = options.slash;
  return {
    name,
    formats: options.formats,
    tiptap: [fenceAtom(name, options.kind)],
    nodeViews: options.view ? { [name]: options.view } : undefined,
    markdown: { fences: [{ kind: options.kind, node: name, match: options.match, ensureId: options.ensureId }] },
    slash: slash
      ? [
          {
            ...slash,
            id: slash.id ?? options.kind,
            label: slash.label as MaybeText,
            run: (ctx) => ctx.insert(name, { attrs: { ...(options.ensureId ? { id: newBlockId() } : {}), ...(slash.attrs ?? {}) }, body: slash.body ?? "" }),
          },
        ]
      : undefined,
    convert: options.convert,
    messages: options.messages,
  };
}
