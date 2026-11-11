// Natural language dates for the `@` menu and the "Date or reminder" item: "tomorrow 9am", "next friday",
// "in 3 days", "remind me monday at 14:30". English words, local time.
import { isoDate } from "./mentions";

export interface NaturalDate {
  /** ISO date, or date and time `YYYY-MM-DDTHH:MM` */
  start: string;
  remind: boolean;
}

const WEEKDAYS: Record<string, number> = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const TIME_RE = /(?:^| )(?:at )?(?:(noon|midnight)|(\d{1,2})(?::(\d{2}))? ?(am|pm|a\.m\.|p\.m\.)|(\d{1,2}):(\d{2}))(?= |$)/;
const REMIND_RE = /^remind(?:er)?(?: me)?(?: (?:on|at))?(?: |$)/;

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** "HH:MM" of a time match, null when it is not a clock time */
function clock(m: RegExpExecArray): string | null {
  let h: number;
  let min = 0;
  if (m[1]) h = m[1] === "noon" ? 12 : 0;
  else if (m[4]) {
    h = Number(m[2]);
    min = Number(m[3] ?? 0);
    if (h < 1 || h > 12) return null;
    const pm = m[4].startsWith("p");
    h = (h % 12) + (pm ? 12 : 0);
  } else {
    h = Number(m[5]);
    min = Number(m[6]);
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** the day a phrase names, null when it names none */
function day(phrase: string, now: Date): Date | null {
  const today = addDays(now, 0);
  if (phrase === "today" || phrase === "now") return today;
  if (phrase === "tomorrow" || phrase === "tmr" || phrase === "tmrw") return addDays(now, 1);
  if (phrase === "yesterday") return addDays(now, -1);
  if (phrase === "next week") return addDays(now, ((8 - today.getDay()) % 7) || 7);
  let m = /^in (\d+|[a-z]+) (day|week|month)s?$/.exec(phrase);
  if (m) {
    const n = /^\d+$/.test(m[1]!) ? Number(m[1]) : NUMBERS[m[1]!];
    if (n === undefined) return null;
    if (m[2] === "month") return new Date(today.getFullYear(), today.getMonth() + n, today.getDate());
    return addDays(now, m[2] === "week" ? n * 7 : n);
  }
  m = /^(?:(this|next|on) )?([a-z]+)$/.exec(phrase);
  if (m && WEEKDAYS[m[2]!] !== undefined) {
    const want = WEEKDAYS[m[2]!]!;
    // the coming one (today counts); "next" is that weekday in the week after this one (weeks start on Monday)
    if (m[1] !== "next") return addDays(now, (want - today.getDay() + 7) % 7);
    const monday = addDays(now, -((today.getDay() + 6) % 7) + 7);
    return addDays(monday, (want + 6) % 7);
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(phrase);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getMonth() === Number(m[2]) - 1 ? d : null;
  }
  // "may 1", "may 1st, 2027", "1 may", "1st of may 2027"; without a year the next one from today
  m = /^(?:([a-z]+) (\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)?(?: of)? ([a-z]+))(?:,? (\d{4}))?$/.exec(phrase);
  if (m) {
    const month = MONTHS[(m[1] ?? m[4])!];
    const date = Number(m[2] ?? m[3]);
    if (month === undefined) return null;
    const year = m[5] ? Number(m[5]) : today.getFullYear();
    let d = new Date(year, month, date);
    if (d.getMonth() !== month) return null;
    if (!m[5] && d < today) d = new Date(year + 1, month, date);
    return d;
  }
  return null;
}

/** the date an English phrase names, with a time when it has one; "remind me" in front makes it a reminder */
export function parseNaturalDate(input: string, now: Date = new Date()): NaturalDate | null {
  let s = input.trim().toLowerCase().replace(/\s+/g, " ").replace(/,(?= )/g, "");
  const r = REMIND_RE.exec(s);
  const remind = !!r;
  if (r) s = s.slice(r[0].length);
  let time: string | null = null;
  const t = TIME_RE.exec(s);
  if (t) {
    time = clock(t);
    if (!time) return null;
    s = (s.slice(0, t.index) + s.slice(t.index + t[0].length)).trim();
  }
  s = s.replace(/^on /, "").replace(/ at$/, "").trim();
  const d = s ? day(s, now) : time ? addDays(now, 0) : null;
  if (!d) return null;
  return { start: time ? `${isoDate(d)}T${time}` : isoDate(d), remind };
}

const PHRASES = ["today", "tomorrow", "yesterday", "next week", ...Object.keys(WEEKDAYS).filter((w) => w.endsWith("day")), "in 1 week"];

/** phrases that start with what was typed, so "tom" offers tomorrow and "next f" next friday */
export function completeNaturalDate(input: string): string[] {
  const q = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return [];
  const r = REMIND_RE.exec(q);
  const rest = r ? q.slice(r[0].length) : q;
  const prefix = r ? r[0].trimEnd() + " " : "";
  const pool = rest.startsWith("next ") ? PHRASES.filter((p) => WEEKDAYS[p] !== undefined).map((p) => `next ${p}`) : PHRASES;
  return pool.filter((p) => p.startsWith(rest) && p !== rest).map((p) => prefix + p);
}
