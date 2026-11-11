export interface NaturalDate {
    /** ISO date, or date and time `YYYY-MM-DDTHH:MM` */
    start: string;
    remind: boolean;
}
/** the date an English phrase names, with a time when it has one; "remind me" in front makes it a reminder */
export declare function parseNaturalDate(input: string, now?: Date): NaturalDate | null;
/** phrases that start with what was typed, so "tom" offers tomorrow and "next f" next friday */
export declare function completeNaturalDate(input: string): string[];
