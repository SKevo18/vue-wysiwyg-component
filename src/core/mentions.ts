import type { StateInline } from "markdown-it";
import type { MentionKind } from "../types";

export interface MentionAttrs {
  kind: MentionKind;
  id: string;
  label: string;
  start: string | null;
  end: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/;
const ID_RE = /^[^\s()\\]+$/;

export function isMentionDate(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v);
}

/** the target in `@[label](<target>)`: `user:<id>`, `page:<id>`, `date:<start>` or `date:<start>/<end>` */
export function mentionTarget(a: Pick<MentionAttrs, "kind" | "id" | "start" | "end">): string | null {
  if (a.kind === "date") {
    if (!isMentionDate(a.start)) return null;
    return `date:${a.start}${isMentionDate(a.end) ? `/${a.end}` : ""}`;
  }
  return (a.kind === "user" || a.kind === "page") && ID_RE.test(a.id) ? `${a.kind}:${a.id}` : null;
}

export function parseMentionTarget(target: string): Omit<MentionAttrs, "label"> | null {
  const m = /^(user|page|date):(.+)$/.exec(target);
  if (!m) return null;
  const kind = m[1] as MentionKind;
  const value = m[2]!;
  if (kind !== "date") return ID_RE.test(value) ? { kind, id: value, start: null, end: null } : null;
  const [start, end, extra] = value.split("/");
  if (extra !== undefined || !isMentionDate(start) || (end !== undefined && !isMentionDate(end))) return null;
  return { kind, id: "", start, end: end ?? null };
}

export function escapeMentionLabel(label: string): string {
  return label.replace(/[\\[\]]/g, "\\$&").replace(/\s*\n\s*/g, " ");
}

export function mentionMarkdown(a: MentionAttrs): string | null {
  const target = mentionTarget(a);
  return target ? `@[${escapeMentionLabel(a.label)}](${target})` : null;
}

/** inline rule for `@[label](kind:value)`; must run before `link` */
export function mentionRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const at = state.pos;
  if (src.charCodeAt(at) !== 0x40 || src.charCodeAt(at + 1) !== 0x5b) return false;
  let label = "";
  let i = at + 2;
  for (; i < state.posMax; i++) {
    const ch = src[i]!;
    if (ch === "\\" && i + 1 < state.posMax) {
      label += src[++i];
      continue;
    }
    if (ch === "]" || ch === "\n") break;
    if (ch === "[") return false;
    label += ch;
  }
  if (src[i] !== "]" || src[i + 1] !== "(") return false;
  const close = src.indexOf(")", i + 2);
  if (close < 0 || close > state.posMax) return false;
  const parsed = parseMentionTarget(src.slice(i + 2, close));
  if (!parsed) return false;
  if (!silent) state.push("mention", "span", 0).meta = { ...parsed, label };
  state.pos = close + 1;
  return true;
}

function parseDate(v: string): { date: Date; time: boolean } {
  const [d, t] = v.split("T");
  const [y, m, day] = d!.split("-").map(Number) as [number, number, number];
  const [hh, mm] = (t ?? "0:0").split(":").map(Number) as [number, number];
  return { date: new Date(y, m - 1, day, hh, mm), time: t !== undefined };
}

/** "May 1, 2024", "May 1, 2024 10:00" or a range of them in the editor's locale */
export function dateLabel(start: string, end: string | null, locale: string): string {
  const fmt = (v: string) => {
    const { date, time } = parseDate(v);
    return new Intl.DateTimeFormat(locale, time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
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
