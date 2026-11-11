import { type Locale, type Messages } from "../i18n";
import type { BaseOptions, CollaborationOptions, DeepPartial, EditorExtension, EditorFormat, EditorHandle, EditorServices, EditorSize } from "../types";
import type { DraftHandle } from "../draft/useDraft";
type __VLS_Props = {
    modelValue: string;
    format?: EditorFormat;
    size?: EditorSize;
    /** read once at mount; nested fields inherit the surrounding editor's */
    extensions?: readonly EditorExtension[];
    base?: BaseOptions;
    placeholder?: string;
    readonly?: boolean;
    autofocus?: boolean | "start" | "end";
    services?: EditorServices;
    locale?: Locale;
    messages?: DeepPartial<Messages> & Record<string, unknown>;
    minRows?: number;
    inline?: boolean;
    expandable?: boolean;
    expandTitle?: string;
    focusMode?: boolean;
    sourceMode?: boolean;
    gutter?: boolean;
    /** ignored in collaboration mode */
    draft?: DraftHandle | null;
    /** read once at mount (remount with a `key` to switch documents): the shared document replaces modelValue, which is then only emitted */
    collaboration?: CollaborationOptions | null;
    /** tiptap key notation (`Mod-Shift-b`); the editor ignores them and emits `shortcut` */
    shortcuts?: string[];
    trailingNewline?: boolean;
    contentClass?: string;
    /** `fixed`: the toolbar above the content, plus a compact one on a text selection. `floating`: only the selection toolbar, with the turn-into menu. `both`: the two at full strength */
    toolbar?: "fixed" | "floating" | "both";
};
declare const __VLS_template: () => {
    __VLS_Slots: {
        header?: (props: {}) => any;
    } & {
        status?: (props: {}) => any;
    } & {
        actions?: (props: {}) => any;
    } & {
        footer?: (props: {}) => any;
    };
};
type __VLS_Slots = ReturnType<typeof __VLS_template>['__VLS_Slots'];
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, EditorHandle, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    blur: (event: FocusEvent) => any;
    focus: (event: FocusEvent) => any;
    submit: () => any;
    "update:modelValue": (value: string) => any;
    save: () => any;
    shortcut: (key: string) => any;
    pending: (value: boolean) => any;
    ready: (handle: EditorHandle) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onBlur?: ((event: FocusEvent) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onSubmit?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onSave?: (() => any) | undefined;
    onShortcut?: ((key: string) => any) | undefined;
    onPending?: ((value: boolean) => any) | undefined;
    onReady?: ((handle: EditorHandle) => any) | undefined;
}>, {
    inline: boolean;
    base: BaseOptions;
    size: EditorSize;
    format: EditorFormat;
    readonly: boolean;
    autofocus: boolean | "end" | "start";
    placeholder: string;
    services: EditorServices;
    locale: Locale;
    toolbar: "floating" | "fixed" | "both";
    messages: DeepPartial<{
        editor: {
            placeholder: string;
            parseFailed: string;
            uploading: string;
            uploadingProgress: string;
            uploadFailed: string;
            copied: string;
            inlineOnly: string;
        };
        toolbar: {
            label: string;
            undo: string;
            redo: string;
            textStyle: string;
            paragraph: string;
            heading: string;
            codeBlock: string;
            bold: string;
            italic: string;
            underline: string;
            strike: string;
            code: string;
            highlight: string;
            color: string;
            link: string;
            bulletList: string;
            orderedList: string;
            taskList: string;
            listStyle: string;
            quote: string;
            callout: string;
            insert: string;
            image: string;
            file: string;
            align: string;
            alignLeft: string;
            alignCenter: string;
            alignRight: string;
            alignJustify: string;
            focus: string;
            exitFocus: string;
            source: string;
            visual: string;
            more: string;
        };
        listStyle: {
            numbering: string;
            bullets: string;
            custom: string;
            apply: string;
            customHint: string;
            styles: {
                decimal: string;
                "lower-alpha": string;
                "upper-alpha": string;
                "lower-roman": string;
                "upper-roman": string;
                disc: string;
                circle: string;
                square: string;
                dash: string;
                arrow: string;
            };
        };
        colors: {
            text: string;
            background: string;
            default: string;
            none: string;
            gray: string;
            red: string;
            orange: string;
            yellow: string;
            green: string;
            blue: string;
            purple: string;
            pink: string;
            brown: string;
            reset: string;
        };
        bubble: {
            label: string;
            askAi: string;
        };
        slash: {
            title: string;
            empty: string;
            groups: {
                text: string;
                lists: string;
                blocks: string;
                media: string;
            };
            items: {
                paragraph: {
                    label: string;
                    description: string;
                };
                heading1: {
                    label: string;
                    description: string;
                };
                heading2: {
                    label: string;
                    description: string;
                };
                heading3: {
                    label: string;
                    description: string;
                };
                heading4: {
                    label: string;
                    description: string;
                };
                heading5: {
                    label: string;
                    description: string;
                };
                heading6: {
                    label: string;
                    description: string;
                };
                quote: {
                    label: string;
                    description: string;
                };
                callout: {
                    label: string;
                    description: string;
                };
                codeBlock: {
                    label: string;
                    description: string;
                };
                hr: {
                    label: string;
                    description: string;
                };
                bulletList: {
                    label: string;
                    description: string;
                };
                orderedList: {
                    label: string;
                    description: string;
                };
                taskList: {
                    label: string;
                    description: string;
                };
                table: {
                    label: string;
                    description: string;
                };
                image: {
                    label: string;
                    description: string;
                };
                file: {
                    label: string;
                    description: string;
                };
                mathInline: {
                    label: string;
                    description: string;
                };
                mathBlock: {
                    label: string;
                    description: string;
                };
                details: {
                    label: string;
                    description: string;
                };
                toggleHeading1: {
                    label: string;
                    description: string;
                };
                toggleHeading2: {
                    label: string;
                    description: string;
                };
                toggleHeading3: {
                    label: string;
                    description: string;
                };
                columns2: {
                    label: string;
                    description: string;
                };
                columns3: {
                    label: string;
                    description: string;
                };
                columns4: {
                    label: string;
                    description: string;
                };
                bookmark: {
                    label: string;
                    description: string;
                };
                embed: {
                    label: string;
                    description: string;
                };
                tableOfContents: {
                    label: string;
                    description: string;
                };
                pageLink: {
                    label: string;
                    description: string;
                };
            };
        };
        convert: {
            title: string;
            targets: {
                paragraph: string;
                unwrap: string;
                columns: string;
            };
        };
        blockMenu: {
            label: string;
            duplicate: string;
            copy: string;
            delete: string;
            color: string;
        };
        gutter: {
            drag: string;
            add: string;
        };
        table: {
            menu: string;
            column: string;
            row: string;
            dragHint: string;
            insertLeft: string;
            insertRight: string;
            insertAbove: string;
            insertBelow: string;
            align: string;
            alignLeft: string;
            alignCenter: string;
            alignRight: string;
            headerRow: string;
            headerColumn: string;
            deleteColumn: string;
            deleteRow: string;
            deleteTable: string;
            addColumn: string;
            addRow: string;
        };
        link: {
            title: string;
            url: string;
            urlPlaceholder: string;
            text: string;
            textPlaceholder: string;
            searchPlaceholder: string;
            results: string;
            searching: string;
            linkTo: string;
            noResults: string;
            apply: string;
            remove: string;
            open: string;
            copy: string;
            edit: string;
        };
        field: {
            tools: string;
            expand: string;
            expandTitle: string;
            close: string;
        };
        draft: {
            idle: string;
            saving: string;
            saved: string;
            offline: string;
            error: string;
        };
        block: {
            edit: string;
            copy: string;
            delete: string;
            more: string;
        };
        code: {
            label: string;
            language: string;
            languagePlaceholder: string;
        };
        callout: {
            label: string;
            changeType: string;
            title: string;
            addTitle: string;
            changeIcon: string;
            icon: string;
            ownIcon: string;
            useIcon: string;
            defaultIcon: string;
            kinds: string;
            types: {
                note: string;
                info: string;
                tip: string;
                success: string;
                important: string;
                warning: string;
                caution: string;
                danger: string;
                question: string;
                example: string;
                details: string;
            };
        };
        image: {
            label: string;
            video: string;
            audio: string;
            alt: string;
            altPlaceholder: string;
            altHelp: string;
            title: string;
            caption: string;
            captionPlaceholder: string;
            width: string;
            resize: string;
            replace: string;
            replaceFile: string;
            originalSize: string;
            toFigure: string;
            zoom: string;
            align: {
                left: string;
                center: string;
                right: string;
                "float-left": string;
                "float-right": string;
            };
        };
        divider: {
            label: string;
            line: string;
            width: string;
            widthPx: string;
            color: string;
            defaultColor: string;
            customColor: string;
            design: string;
            customChar: string;
            charInvalid: string;
            styles: {
                solid: string;
                dashed: string;
                dotted: string;
                double: string;
            };
            designs: {
                none: string;
                star: string;
                diamond: string;
                dots: string;
                fleuron: string;
            };
            colors: {
                red: string;
                orange: string;
                amber: string;
                green: string;
                teal: string;
                blue: string;
                violet: string;
                pink: string;
            };
        };
        math: {
            label: string;
            edit: string;
            empty: string;
            placeholder: string;
            tex: string;
        };
        details: {
            label: string;
            title: string;
            titlePlaceholder: string;
            toggleDefault: string;
            openByDefault: string;
            closedByDefault: string;
            headingLabel: string;
            expand: string;
            collapse: string;
        };
        footnote: {
            label: string;
        };
        source: {
            label: string;
        };
        columns: {
            label: string;
            add: string;
            remove: string;
            removeHint: string;
            equal: string;
            resize: string;
        };
        bookmark: {
            edit: string;
            label: string;
            url: string;
            placeholder: string;
            create: string;
            loading: string;
            failed: string;
            refresh: string;
            open: string;
        };
        embed: {
            edit: string;
            url: string;
            placeholder: string;
            create: string;
            open: string;
            interact: string;
            resize: string;
            defaultHeight: string;
            providers: {
                youtube: string;
                vimeo: string;
                loom: string;
                figma: string;
                gist: string;
                maps: string;
                tweet: string;
                codepen: string;
                generic: string;
            };
        };
        toc: {
            label: string;
            empty: string;
        };
        pageLink: {
            label: string;
            untitled: string;
            search: string;
            searchPlaceholder: string;
        };
        mention: {
            label: string;
            empty: string;
            searching: string;
            groups: {
                user: string;
                page: string;
                date: string;
            };
            today: string;
            tomorrow: string;
            yesterday: string;
            date: string;
            time: string;
            includeTime: string;
            endDate: string;
            editDate: string;
        };
        paste: {
            label: string;
            link: string;
            bookmark: string;
            embed: string;
        };
        diagram: {
            alt: string;
            loading: string;
            empty: string;
            failed: string;
        };
        palette: {
            background: string;
            text: string;
            default: string;
            gray: string;
            brown: string;
            orange: string;
            yellow: string;
            green: string;
            blue: string;
            purple: string;
            pink: string;
            red: string;
        };
        dialog: {
            close: string;
            cancel: string;
        };
    }> & Record<string, unknown>;
    extensions: readonly EditorExtension[];
    minRows: number;
    expandable: boolean;
    expandTitle: string;
    focusMode: boolean;
    sourceMode: boolean;
    gutter: boolean;
    draft: DraftHandle | null;
    collaboration: CollaborationOptions | null;
    shortcuts: string[];
    trailingNewline: boolean;
    contentClass: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
