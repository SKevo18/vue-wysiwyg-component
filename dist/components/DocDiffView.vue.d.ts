import { type DiffBlock, type DocNode } from "../diff/docdiff";
import type { Locale, Messages } from "../i18n";
import type { BaseOptions, DeepPartial, EditorExtension, EditorServices } from "../types";
type __VLS_Props = {
    /** the older version; null shows the newer one as wholly added */
    before: DocNode | string | null;
    after: DocNode | string;
    /** `json`: ProseMirror JSON (objects or JSON strings); `markdown` and `html` are parsed with the editor's schema */
    format?: "json" | "markdown" | "html";
    /** read once at mount, like the editor's */
    extensions?: readonly EditorExtension[];
    base?: BaseOptions;
    services?: EditorServices;
    locale?: Locale;
    messages?: DeepPartial<Messages> & Record<string, unknown>;
    contentClass?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    diff: (blocks: DiffBlock[]) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onDiff?: ((blocks: DiffBlock[]) => any) | undefined;
}>, {
    base: BaseOptions;
    format: "json" | "markdown" | "html";
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
                mentionPerson: {
                    label: string;
                    description: string;
                };
                date: {
                    label: string;
                    description: string;
                };
                emoji: {
                    label: string;
                    description: string;
                };
                tabs: {
                    label: string;
                    description: string;
                };
                button: {
                    label: string;
                    description: string;
                };
                breadcrumbs: {
                    label: string;
                    description: string;
                };
                aiBlock: {
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
                reminder: string;
            };
            today: string;
            tomorrow: string;
            yesterday: string;
            date: string;
            time: string;
            includeTime: string;
            endDate: string;
            editDate: string;
            editReminder: string;
            reminder: string;
            remind: string;
            person: string;
            personPlaceholder: string;
            datePlaceholder: string;
        };
        emoji: {
            label: string;
            search: string;
            results: string;
            empty: string;
            loading: string;
            failed: string;
            categories: string;
            recent: string;
            tone: string;
            tones: {
                0: string;
                1: string;
                2: string;
                3: string;
                4: string;
                5: string;
            };
            groups: {
                0: string;
                1: string;
                3: string;
                4: string;
                5: string;
                6: string;
                7: string;
                8: string;
                9: string;
            };
        };
        tabs: {
            label: string;
            untitled: string;
            labelField: string;
            moveLeft: string;
            moveRight: string;
            remove: string;
            add: string;
        };
        button: {
            label: string;
            untitled: string;
            labelField: string;
            actions: string;
            noActions: string;
            kind: string;
            kinds: {
                insert: string;
                link: string;
            };
            fields: {
                markdown: string;
                url: string;
            };
            placeholders: {
                markdown: string;
                url: string;
            };
            moveUp: string;
            moveDown: string;
            removeAction: string;
            addAction: string;
            done: string;
        };
        breadcrumbs: {
            label: string;
            empty: string;
        };
        ai: {
            label: string;
            prompt: string;
            promptPlaceholder: string;
            scope: string;
            generate: string;
            regenerate: string;
            stop: string;
            done: string;
            writing: string;
            failed: string;
            updated: string;
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
        diff: {
            movedHere: string;
            movedAway: string;
            changed: string;
        };
    }> & Record<string, unknown>;
    services: EditorServices;
    locale: Locale;
    extensions: readonly EditorExtension[];
    contentClass: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
