import { escapeChipLabel } from "../inline";

/** kinds of the `mention` node; pages are `pageLink` chips */
export type MentionNodeKind = "user" | "date";

export interface MentionAttrs {
  kind: MentionNodeKind;
  id: string;
  label: string;
  start: string | null;
  end: string | null;
  /** dates only: a reminder, shown with a bell */
  remind: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/;
const ID_RE = /^[^\s()\\]+$/;

export function isMentionDate(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v);
}

/** the target in `@[label](<target>)`: `user:<id>`, `date:<start>`, `date:<start>/<end>`, with `!` after a reminder's dates */
export function mentionTarget(a: Pick<MentionAttrs, "kind" | "id" | "start" | "end" | "remind">): string | null {
  if (a.kind === "date") {
    if (!isMentionDate(a.start)) return null;
    return `date:${a.start}${isMentionDate(a.end) ? `/${a.end}` : ""}${a.remind ? "!" : ""}`;
  }
  return a.kind === "user" && ID_RE.test(a.id) ? `user:${a.id}` : null;
}

export function parseMentionTarget(target: string): Omit<MentionAttrs, "label"> | null {
  const m = /^(user|date):(.+)$/.exec(target);
  if (!m) return null;
  const kind = m[1] as MentionNodeKind;
  let value = m[2]!;
  if (kind === "user") return ID_RE.test(value) ? { kind, id: value, start: null, end: null, remind: false } : null;
  const remind = value.endsWith("!");
  if (remind) value = value.slice(0, -1);
  const [start, end, extra] = value.split("/");
  if (extra !== undefined || !isMentionDate(start) || (end !== undefined && !isMentionDate(end))) return null;
  return { kind, id: "", start, end: end ?? null, remind };
}

export function mentionMarkdown(a: MentionAttrs): string | null {
  const target = mentionTarget(a);
  return target ? `@[${escapeChipLabel(a.label)}](${target})` : null;
}

function parseDate(v: string): { date: Date; time: boolean } {
  const [d, t] = v.split("T");
  const [y, m, day] = d!.split("-").map(Number) as [number, number, number];
  const [hh, mm] = (t ?? "0:0").split(":").map(Number) as [number, number];
  return { date: new Date(y, m - 1, day, hh, mm), time: t !== undefined };
}

/**
 * "May 1, 2024", "May 1, 2024, 10:00 AM" or a range of them joined by " → ", in the editor's locale. date and
 * time are formatted apart and joined by ", " with plain spaces: engines differ in how they join them ("at" in
 * Safari) and in the space before AM, and an importer has to write the same label
 */
export function dateLabel(start: string, end: string | null, locale: string): string {
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const hour = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const fmt = (v: string) => {
    const { date, time } = parseDate(v);
    return (time ? `${day.format(date)}, ${hour.format(date)}` : day.format(date)).replace(/\s/g, " ");
  };
  return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `/p/{id}` style template with the id filled in */
export function pageHref(template: string, id: string): string {
  return template.replace("{id}", encodeURIComponent(id));
}
