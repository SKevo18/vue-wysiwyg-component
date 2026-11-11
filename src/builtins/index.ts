import type { EditorExtension, ResolvedBase } from "../types";
import { mathExtension } from "./math";
import { detailsExtension } from "./details";
import { footnotesExtension } from "./footnotes";
import { columnsExtension } from "./columns";
import { bookmarkExtension } from "./bookmark";
import { embedExtension } from "./embed";
import { tocExtension } from "./toc";
import { pageLinkExtension } from "./pageLink";
import { mentionExtension } from "./mention";

export function builtinExtensions(base: ResolvedBase): EditorExtension[] {
  const out: EditorExtension[] = [];
  if (base.math) out.push(mathExtension);
  if (base.details) out.push(detailsExtension);
  if (base.footnotes) out.push(footnotesExtension);
  if (base.columns) out.push(columnsExtension);
  if (base.bookmarks) out.push(bookmarkExtension);
  if (base.embeds) out.push(embedExtension);
  if (base.toc) out.push(tocExtension);
  if (base.pageLinks) out.push(pageLinkExtension);
  if (base.mentions) out.push(mentionExtension(base));
  return out;
}
