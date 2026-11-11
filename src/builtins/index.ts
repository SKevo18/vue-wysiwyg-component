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
import { emojiExtension } from "./emoji";
import { tabsExtension } from "./tabs";
import { buttonExtension } from "./button";
import { breadcrumbsExtension } from "./breadcrumbs";
import { aiExtension } from "./ai";

export function builtinExtensions(base: ResolvedBase): EditorExtension[] {
  const out: EditorExtension[] = [];
  if (base.math) out.push(mathExtension);
  if (base.details) out.push(detailsExtension);
  if (base.footnotes) out.push(footnotesExtension);
  if (base.columns) out.push(columnsExtension);
  if (base.tabs) out.push(tabsExtension);
  if (base.bookmarks) out.push(bookmarkExtension);
  if (base.embeds) out.push(embedExtension);
  if (base.toc) out.push(tocExtension);
  if (base.breadcrumbs) out.push(breadcrumbsExtension);
  if (base.buttons) out.push(buttonExtension);
  if (base.ai) out.push(aiExtension);
  if (base.pageLinks) out.push(pageLinkExtension(base));
  if (base.mentions) out.push(mentionExtension());
  if (base.emoji) out.push(emojiExtension);
  return out;
}
