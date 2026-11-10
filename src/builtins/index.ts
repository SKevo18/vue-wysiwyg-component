import type { EditorExtension, ResolvedBase } from "../types";
import { mathExtension } from "./math";
import { detailsExtension } from "./details";
import { footnotesExtension } from "./footnotes";

export function builtinExtensions(base: ResolvedBase): EditorExtension[] {
  const out: EditorExtension[] = [];
  if (base.math) out.push(mathExtension);
  if (base.details) out.push(detailsExtension);
  if (base.footnotes) out.push(footnotesExtension);
  return out;
}
