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
/** the groups the picker shows, in order; 2 is skin tone components */
export declare const EMOJI_GROUPS: readonly [0, 1, 3, 4, 5, 6, 7, 8, 9];
/** the emoji data; the first call loads it */
export declare function loadEmoji(): Promise<EmojiData>;
/** the data when it has loaded already, for synchronous lookups such as `:smile:` while typing */
export declare function emojiNow(): EmojiData | null;
/** the emoji with a skin tone (1 to 5; 0 is the default yellow) */
export declare function withTone(e: Emoji, tone: number): string;
/**
 * emoji matching every word of the query, best first: a shortcode equal to the query, a shortcode starting with
 * it, a word of the name starting with it, then tags
 */
export declare function searchEmoji(data: EmojiData, query: string, limit?: number): Emoji[];
/** emoji picked lately, newest first */
export declare function recentEmoji(): string[];
export declare function rememberEmoji(emoji: string): void;
export declare function savedTone(): number;
export declare function saveTone(tone: number): void;
