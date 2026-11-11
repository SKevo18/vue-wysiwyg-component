// Emoji data from emojibase, loaded on first use as a chunk of its own: the picker, `:` suggestions, `:name:`.

export interface Emoji {
  emoji: string;
  label: string;
  /** emojibase group: 0 smileys, 1 people, 3 animals, 4 food, 5 travel, 6 activities, 7 objects, 8 symbols, 9 flags */
  group: number;
  /** GitHub shortcodes without colons, e.g. `smile` */
  shortcodes: string[];
  tags: string[];
  /** the five skin tone variants, light to dark, when it has them */
  skins?: string[];
}

export interface EmojiData {
  list: Emoji[];
  byShortcode: Map<string, Emoji>;
}

interface RawEmoji {
  unicode: string;
  label: string;
  hexcode: string;
  group?: number;
  order?: number;
  tags?: string[];
  skins?: RawEmoji[];
}

/** the groups the picker shows, in order; 2 is skin tone components */
export const EMOJI_GROUPS = [0, 1, 3, 4, 5, 6, 7, 8, 9] as const;

const TONES = ["1F3FB", "1F3FC", "1F3FD", "1F3FE", "1F3FF"];

let loading: Promise<EmojiData> | null = null;
let loaded: EmojiData | null = null;

function build(raw: RawEmoji[], codes: Record<string, string | string[]>): EmojiData {
  const list: Emoji[] = [];
  const byShortcode = new Map<string, Emoji>();
  for (const r of [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (r.group === undefined || r.group === 2) continue;
    const sc = codes[r.hexcode];
    // each tone variant has one modifier, repeated for every person in it
    const skins = r.skins?.length
      ? TONES.map((tone) => r.skins!.find((s) => s.hexcode.split("-").every((part) => !TONES.includes(part) || part === tone))?.unicode ?? r.unicode)
      : undefined;
    const e: Emoji = { emoji: r.unicode, label: r.label, group: r.group, shortcodes: sc === undefined ? [] : Array.isArray(sc) ? sc : [sc], tags: r.tags ?? [], skins };
    list.push(e);
    for (const s of e.shortcodes) byShortcode.set(s, e);
  }
  return { list, byShortcode };
}

/** the emoji data; the first call loads it */
export function loadEmoji(): Promise<EmojiData> {
  loading ??= Promise.all([import("emojibase-data/en/compact.json"), import("emojibase-data/en/shortcodes/github.json")]).then(([raw, codes]) => {
    loaded = build(raw.default as unknown as RawEmoji[], codes.default as unknown as Record<string, string | string[]>);
    return loaded;
  });
  return loading;
}

/** the data when it has loaded already, for synchronous lookups such as `:smile:` while typing */
export function emojiNow(): EmojiData | null {
  return loaded;
}

/** the emoji with a skin tone (1 to 5; 0 is the default yellow) */
export function withTone(e: Emoji, tone: number): string {
  return (tone > 0 && e.skins?.[tone - 1]) || e.emoji;
}

/**
 * emoji matching every word of the query, best first: a shortcode equal to the query, a shortcode starting with
 * it, a word of the name starting with it, then tags
 */
export function searchEmoji(data: EmojiData, query: string, limit = 50): Emoji[] {
  const words = query.trim().toLowerCase().replace(/^:|:$/g, "").split(/[\s_]+/).filter(Boolean);
  if (!words.length) return [];
  const joined = words.join("_");
  const scored: { e: Emoji; score: number; i: number }[] = [];
  data.list.forEach((e, i) => {
    const names = e.label.toLowerCase().split(/[\s:,-]+/);
    let score = 0;
    if (e.shortcodes.includes(joined)) score = 4;
    else if (e.shortcodes.some((s) => s.startsWith(joined))) score = 3;
    else if (words.every((w) => names.some((n) => n.startsWith(w)))) score = 2;
    else if (words.every((w) => names.some((n) => n.startsWith(w)) || e.tags.some((t) => t.startsWith(w)) || e.shortcodes.some((s) => s.includes(w)))) score = 1;
    if (score) scored.push({ e, score, i });
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.slice(0, limit).map((s) => s.e);
}

const RECENT_KEY = "wy-emoji-recent";
const RECENT_MAX = 24;

/** emoji picked lately, newest first */
export function recentEmoji(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(emoji: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...recentEmoji().filter((x) => x !== emoji)].slice(0, RECENT_MAX)));
  } catch {
    // private mode or full storage: nothing to remember
  }
}

const TONE_KEY = "wy-emoji-tone";

export function savedTone(): number {
  try {
    const n = Number(localStorage.getItem(TONE_KEY) ?? 0);
    return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveTone(tone: number) {
  try {
    localStorage.setItem(TONE_KEY, String(tone));
  } catch {
    // nothing to keep
  }
}
