import type { EditorServices } from "../types";

/** the host's `openLink` first; otherwise internal pages open in this tab and outside links in a new one */
export function followLink(services: EditorServices, href: string, event: MouseEvent, sameTab: boolean) {
  if (!href) return;
  event.preventDefault();
  if (services.openLink?.(href, event)) return;
  if (sameTab && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button !== 1) window.location.assign(href);
  else window.open(href, "_blank", "noopener,noreferrer");
}

const RESOLVE_TTL = 60_000;
const resolved = new Map<string, { at: number; result: Promise<{ title: string; icon?: string } | null> }>();

/** `services.resolveLink`, shared by every block and chip of one address for a minute */
export function resolveOnce(services: EditorServices, href: string): Promise<{ title: string; icon?: string } | null> {
  const resolve = services.resolveLink;
  if (!resolve || !href) return Promise.resolve(null);
  const hit = resolved.get(href);
  if (hit && Date.now() - hit.at < RESOLVE_TTL) return hit.result;
  const result = resolve(href).catch(() => null);
  resolved.set(href, { at: Date.now(), result });
  // a failed or empty lookup is tried again next time
  void result.then((r) => r || resolved.delete(href));
  return result;
}
