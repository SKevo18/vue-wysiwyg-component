import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

export interface TocEntry {
  pos: number;
  level: number;
  text: string;
}

/** headings and toggle headings in document order */
export function tocEntries(doc: PMNode): TocEntry[] {
  const out: TocEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      if (node.textContent.trim()) out.push({ pos, level: node.attrs.level as number, text: node.textContent.trim() });
      return false;
    }
    if (node.type.name === "details" && node.attrs.heading && String(node.attrs.title ?? "").trim()) out.push({ pos, level: node.attrs.heading as number, text: String(node.attrs.title).trim() });
    return !node.isTextblock;
  });
  return out;
}

/** lower case words joined by dashes: "Setts and dens" and "setts-and-dens" both become "setts-and-dens" */
function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

/** The heading a same-document link (`#Setts and dens` or `#setts-and-dens`) points at: its exact text first, then its slug. */
export function headingFor(doc: PMNode, hash: string): TocEntry | null {
  let id = hash.replace(/^#/, "");
  try {
    id = decodeURIComponent(id);
  } catch {
    // a stray % stays as it is
  }
  const entries = tocEntries(doc);
  const want = slug(id);
  return entries.find((e) => e.text === id) ?? (want ? (entries.find((e) => slug(e.text) === want) ?? null) : null);
}

/** Brings the heading at `pos` to the top of its scroll container. */
export function scrollToHeading(view: EditorView, pos: number) {
  const dom = view.nodeDOM(pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: "smooth", block: "start" });
}
