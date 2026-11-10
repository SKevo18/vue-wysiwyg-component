export interface FenceInfo {
    kind: string;
    attrs: Record<string, string>;
}
export declare function parseInfo(info: string): FenceInfo;
export declare function formatInfo(kind: string, attrs: Record<string, string | undefined>): string;
export declare function fenceFor(body: string): string;
export declare function blockBody(body: string): string;
export declare function newBlockId(): string;
export declare function fenceOpen(line: string): {
    marker: string;
    info: string;
} | null;
export declare function fenceClose(line: string, marker: string): boolean;
export interface Section {
    label: string;
    body: string;
}
export declare function splitSections(body: string): Section[];
export declare function joinSections(sections: Section[]): string;
