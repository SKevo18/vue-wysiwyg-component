import type { Component } from "vue";
import type { AnyExtension, ChainedCommands, Editor, JSONContent, Range } from "@tiptap/core";
import type { Fragment, Node as PMNode, Schema } from "@tiptap/pm/model";
import type { MarkdownIt, Token } from "markdown-it";
import type { MarkdownSerializerState, ParseSpec } from "prosemirror-markdown";
import type { FenceInfo } from "./core/info";
import type { KatexLoader } from "./core/math";
import type { Locale, Messages } from "./i18n";
export type EditorFormat = "markdown" | "html";
export type EditorSize = "compact" | "full";
export type MaybeText = string | (() => string);
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export interface BaseOptions {
    /** false disables headings. default 1-6 (markdown), 1-3 (html). */
    headings?: HeadingLevel[] | false;
    /** html only. */
    underline?: boolean;
    /** markdown `==text==`; multicolour `<mark>` in html. */
    highlight?: boolean;
    /** html only. */
    color?: boolean;
    /** html only; markdown cannot store it. */
    textAlign?: boolean;
    lists?: boolean;
    /** markdown `{style=lower-roman}` line after a list; default on for markdown. */
    listStyles?: boolean;
    taskLists?: boolean;
    blockquote?: boolean;
    callouts?: boolean | string[];
    dividers?: boolean;
    codeBlocks?: boolean | string[];
    tables?: boolean;
    images?: boolean;
    files?: boolean;
    links?: boolean;
    /** longest side of uploaded images in px (larger ones are downscaled); false keeps them as they are. */
    downscale?: number | false;
    math?: boolean;
    details?: boolean;
    footnotes?: boolean;
}
export interface ResolvedBase {
    headings: HeadingLevel[];
    underline: boolean;
    highlight: boolean;
    color: boolean;
    textAlign: boolean;
    lists: boolean;
    listStyles: boolean;
    taskLists: boolean;
    blockquote: boolean;
    callouts: string[];
    dividers: boolean;
    codeBlocks: string[] | false;
    tables: boolean;
    images: boolean;
    files: boolean;
    links: boolean;
    downscale: number | false;
    math: boolean;
    details: boolean;
    footnotes: boolean;
}
export interface UploadOptions {
    /** fraction 0..1. */
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
}
export interface UploadResult {
    url: string;
    name: string;
    size?: number;
    type: string;
    width?: number;
    height?: number;
}
export type PickedFile = File | UploadResult;
export interface LinkSuggestion {
    href: string;
    title: string;
    detail?: string;
}
export interface AskAiRequest {
    selection: string;
    content: string;
    before: string;
    after: string;
}
export type ToastKind = "info" | "success" | "error";
export interface EditorServices {
    upload?: (file: File, options: UploadOptions) => Promise<UploadResult>;
    pickFile?: (kind: "image" | "file") => Promise<PickedFile[] | null>;
    searchLinks?: (query: string, signal: AbortSignal) => Promise<LinkSuggestion[]>;
    toast?: (message: string, kind: ToastKind) => void;
    askAi?: (request: AskAiRequest) => void;
    sourceEditor?: Component;
    katex?: KatexLoader;
}
export interface MarkdownPluginContext {
    schema: Schema;
    inline: boolean;
}
export interface FenceContext {
    info: FenceInfo;
    /** without its final newline. */
    body: string;
    token: Token;
    /** the fence becomes `<name>_open`, the body parsed as blocks, `<name>_close` (meta on the open token). */
    container(name: string, meta: Record<string, unknown>, body?: string): void;
    /** the fence becomes `<name>_open`, one `<child>` container per `==== label` section, `<name>_close`. */
    sections(name: string, child: string, meta: Record<string, unknown>, body?: string): void;
    /** the fence becomes a single `<name>` token with `meta` (body in `token.content`). */
    atom(name: string, meta: Record<string, unknown>): void;
}
/** without `parse` the fence becomes an atom node holding `{attrs, body}`. */
export interface FenceRule {
    kind: string;
    match?: (info: FenceInfo) => boolean;
    node?: string;
    ensureId?: boolean;
    parse?: (ctx: FenceContext) => void;
}
export interface SerializeHelpers {
    writeFence(state: MarkdownSerializerState, node: PMNode, info: string, body: string): void;
    contentMarkdown(node: PMNode): string;
    sectionsMarkdown(node: PMNode): string;
    inlineMarkdown(content: Fragment): string;
}
export type NodeSerializer = (state: MarkdownSerializerState, node: PMNode, parent: PMNode, index: number, helpers: SerializeHelpers) => void;
export interface MarkSerializer {
    open: string | ((state: MarkdownSerializerState, mark: unknown, parent: PMNode, index: number) => string);
    close: string | ((state: MarkdownSerializerState, mark: unknown, parent: PMNode, index: number) => string);
    mixable?: boolean;
    expelEnclosingWhitespace?: boolean;
    escape?: boolean;
}
export interface MarkdownHooks {
    plugins?: ((md: MarkdownIt, ctx: MarkdownPluginContext) => void)[];
    fences?: FenceRule[];
    retag?: (tokens: Token[], ctx: {
        Token: new (type: string, tag: string, nesting: 1 | 0 | -1) => Token;
    }) => void;
    /** later extensions override earlier specs (e.g. `fence`). */
    tokens?: Record<string, ParseSpec>;
    /** later extensions override earlier ones (e.g. `codeBlock`). */
    nodes?: Record<string, NodeSerializer>;
    marks?: Record<string, MarkSerializer>;
    /** block parser only. */
    normalize?: (doc: PMNode) => PMNode;
    /** a regex alternative (e.g. `"%%"`). */
    escape?: string;
}
export interface SlashContext {
    editor: Editor;
    range: Range | undefined;
    services: EditorServices;
    insert(type: string, attrs?: Record<string, unknown>, content?: JSONContent[]): void;
    insertSections(type: string, child: string, count?: number): void;
    clear(): void;
    chain(): ChainedCommands;
}
export interface SlashItemDef {
    id: string;
    /** one of the built-in `text`, `lists`, `blocks`, `media` or one declared in `slashGroups`. */
    group: string;
    /** built-in items use 1-100. */
    rank?: number;
    label: MaybeText;
    description?: MaybeText;
    icon?: Component;
    keywords?: string;
    inline?: boolean;
    enabled?: (editor: Editor) => boolean;
    run(ctx: SlashContext): void;
}
export interface SlashGroupDef {
    id: string;
    label: MaybeText;
    /** built-in groups: text 10, lists 20, blocks 30, media 40. */
    rank: number;
}
export interface SlashItem {
    id: string;
    group: string;
    label: string;
    description: string;
    icon: Component | undefined;
    keywords: string;
    inline: boolean;
    enabled(editor: Editor): boolean;
    run(editor: Editor, range?: Range): void;
}
export interface ToolItemDef {
    id: string;
    label: MaybeText;
    icon: Component;
    /** tiptap key notation, e.g. `Mod-Shift-q`. */
    shortcut?: string;
    rank?: number;
    active?: (editor: Editor) => boolean;
    enabled?: (editor: Editor) => boolean;
    run(editor: Editor, services: EditorServices): void;
}
export interface ConvertItem {
    label: Fragment;
    body: PMNode[];
    checked: boolean;
}
export interface ConvertContext {
    schema: Schema;
    items(blocks: readonly PMNode[]): ConvertItem[] | null;
    list(type: "bulletList" | "orderedList" | "taskList", items: ConvertItem[]): PMNode;
    paragraphs(blocks: readonly PMNode[]): PMNode[] | null;
    itemParagraphs(items: ConvertItem[]): PMNode[];
    wrap(blocks: readonly PMNode[], node: string, target: string): PMNode[] | null;
    parse(md: string): PMNode[];
    parseInline(md: string): Fragment;
    serialize(blocks: readonly PMNode[]): string;
    inlineMarkdown(content: Fragment): string;
    plainText(content: Fragment): string;
}
export interface ConvertTargetDef {
    id: string;
    label: MaybeText;
    icon?: Component;
    /** menu order: paragraph 0, headings 10-15, lists 20-22, containers 30-39, code 60, unwrap 100. */
    rank?: number;
    container?: string;
    convert?: (blocks: readonly PMNode[], ctx: ConvertContext) => PMNode[] | null;
}
export interface ContainerSpec {
    title(node: PMNode): string;
    build(input: {
        title: string;
        content: PMNode[];
    }, ctx: ConvertContext, target: string): PMNode;
}
export interface ConvertHooks {
    targets?: ConvertTargetDef[];
    convertible?: string[];
    wrappable?: string[];
    containers?: Record<string, ContainerSpec>;
    sections?: Record<string, string>;
    items?: Record<string, (node: PMNode, ctx: ConvertContext) => ConvertItem[]>;
    paragraphs?: Record<string, (node: PMNode, ctx: ConvertContext) => PMNode[] | null>;
}
export type MathEdit = (value: string, start: number, end: number) => {
    value: string;
    start: number;
    end: number;
};
export interface MathHooks {
    /** rendered under the TeX field of both formula editors; gets `apply(edit: MathEdit)`. use mousedown.prevent on its buttons. */
    palette?: Component;
}
export interface FigureHooks {
    tools?: Component;
}
export interface CodeBlockHooks {
    menu?: Component;
    below?: Component;
    label?: (node: PMNode) => string | null;
}
export interface EditorExtension {
    name: string;
    formats?: EditorFormat[];
    tiptap?: AnyExtension[];
    nodeViews?: Record<string, Component>;
    markdown?: MarkdownHooks;
    slash?: SlashItemDef[];
    slashGroups?: SlashGroupDef[];
    toolbar?: ToolItemDef[];
    bubble?: ToolItemDef[];
    convert?: ConvertHooks;
    codeBlock?: CodeBlockHooks;
    figure?: FigureHooks;
    math?: MathHooks;
    messages?: Partial<Record<Locale, DeepPartial<Messages> & Record<string, unknown>>>;
}
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export interface EditorSelection {
    empty: boolean;
    text: string;
    markdown: string;
    html: string;
    from: number;
    to: number;
}
export interface EditorHandle {
    readonly editor: Editor | null;
    readonly format: EditorFormat;
    getContent(format?: EditorFormat | "text"): string;
    setContent(value: string, options?: {
        undoable?: boolean;
        format?: EditorFormat;
    }): void;
    insertAtCursor(value: string, options?: {
        format?: EditorFormat;
    }): void;
    getSelection(): EditorSelection;
    focus(where?: "start" | "end"): void;
    isEmpty(): boolean;
    flush(): void;
}
