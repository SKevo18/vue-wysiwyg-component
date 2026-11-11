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
export declare function isMentionDate(v: unknown): v is string;
/** the target in `@[label](<target>)`: `user:<id>`, `date:<start>`, `date:<start>/<end>`, with `!` after a reminder's dates */
export declare function mentionTarget(a: Pick<MentionAttrs, "kind" | "id" | "start" | "end" | "remind">): string | null;
export declare function parseMentionTarget(target: string): Omit<MentionAttrs, "label"> | null;
export declare function mentionMarkdown(a: MentionAttrs): string | null;
/**
 * "May 1, 2024", "May 1, 2024, 10:00 AM" or a range of them joined by " → ", in the editor's locale. date and
 * time are formatted apart and joined by ", " with plain spaces: engines differ in how they join them ("at" in
 * Safari) and in the space before AM, and an importer has to write the same label
 */
export declare function dateLabel(start: string, end: string | null, locale: string): string;
export declare function isoDate(d: Date): string;
/** `/p/{id}` style template with the id filled in */
export declare function pageHref(template: string, id: string): string;
