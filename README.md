# @skevo18/vue-wysiwyg-component

A Tiptap 3 based WYSIWYG editor for Vue 3 that stores either markdown or HTML, as a compact field or a full page editor. It exists so apps can share one editor with byte-stable markdown round trips, drafts, uploads and an extension API for their own custom blocks. The built `dist/` is committed, so it installs straight from GitHub.

## Usage

```sh
bun add github:SKevo18/vue-wysiwyg-component
```

Peer dependencies: `vue` ^3.5, `@tiptap/core`, `@tiptap/pm` and `@tiptap/vue-3` ^3.32.2, and `@lucide/vue`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { WysiwygEditor } from "@skevo18/vue-wysiwyg-component";
import "@skevo18/vue-wysiwyg-component/style.css";

const text = ref("# Hello\n\nSome **markdown**.\n");
</script>

<template>
  <WysiwygEditor v-model="text" size="full" />
</template>
```

## Toolbars

`toolbar` picks the formatting toolbars of the full size editor:

| Value | Shows |
|---|---|
| `fixed` (default) | The toolbar above the content, plus a compact floating toolbar on a text selection: marks, colour, link, host `bubble` tools and Ask AI. |
| `both` | The toolbar above the content, plus the full floating toolbar, which adds the turn-into menu named after the current block. |
| `floating` | Only the full floating toolbar. The compact size also hides its field tools and shows the floating toolbar instead. |

The floating toolbar stays inside the viewport, opens below the selection on touch screens, and is a keyboard toolbar: Alt+F10 in the editor moves focus into it, the arrow keys move between its buttons, Esc returns to the text. Its colour menu has a text colour row, a background colour row and a reset. The fixed toolbar has the same colour menu in both formats.

In the compact size, `fixed` and `both` show the field tools while the field has focus: marks, colour, link, inline math and expand, in a row under the text inside the field, so they never cover what sits above it.

Keys the editor handles (its shortcuts such as Mod+K, Mod+B, Enter, and the host `shortcuts`) stop propagating at the editor, so a host's global shortcut for the same key does not fire as well. Keys the editor leaves alone bubble on as usual.

## Colours and underline

Markdown documents colour with a palette of nine names: `gray brown orange yellow green blue purple pink red`. A background colour is the name with `_bg` (`yellow_bg`). They render through CSS variables in `style.css`, `--vc-color-<name>` and `--vc-bg-<name>`, with Notion like muted values that switch to their dark variants when the host sets `color-scheme: dark`. Override them like the other `--vc-*` tokens.

| Markdown | Document |
|---|---|
| `++text++` | `underline` mark |
| `==text==` | `highlight` mark without a colour |
| `[text]{color=red}` | `textStyle` mark, `color: "red"` |
| `[text]{bg=yellow}` | `highlight` mark, `color: "yellow_bg"` (`bg=yellow_bg` is read too) |
| `[text]{color=red bg=yellow}` | both marks over the same text |

Colour spans hold any other marks, inline code included (``[**a** `code`]{color=blue}``), and a link label may hold a colour span (`[[a]{color=red} b](/p/1)`). Marks nest by their extent: a mark that starts earlier or runs further wraps the others, over exactly the same text a colour wraps a link (`[[label](/p/1)]{color=red}`) and the other marks sit inside the span. A span inside a span of the same kind (`[a [b]{color=red} c]{color=blue}`, `==a [b]{bg=yellow} c==`) colours its own text and the outer one resumes after it. Text with any mix of text colour, background and the other marks reads back from its markdown unchanged, and that markdown is written again byte for byte. Equivalent spellings of the same text (`**[a]{color=red}**` and `[**a**]{color=red}`) read the same and are written in the one form above. Colours outside the palette are not written to markdown. html documents keep tiptap's `Color` and multicolour `Highlight`, which store any CSS colour as written (the html colour menu uses fixed values for mail clients).

Block colours are a `color` attribute on `paragraph heading listItem taskItem blockquote callout details tableCell tableHeader pageLink`, set from the block menu (the gutter grip or Mod+/) under "Colour". A text token colours the text, a `_bg` token fills the block. Markdown writes them on an attribute line right under the block:

```md
A note on its own.
{color=gray_bg}

- first item
  {color=red}
- second item
{style=square}
```

A list item's line follows its first line, so nested blocks keep their own lines; the list's own `{style=… marker=…}` line stays under the list. Table cells keep their colour in html and shared documents only, pipe tables have no place for it. The base options `color`, `highlight` and `underline` (all on by default) turn the pieces off.

## Links and images

A click on a link opens it, in editable and readonly editors; a drag over a link selects text instead, and Shift extends the selection. The editor calls `services.openLink(href, event)` first and opens a new tab (`noopener`) unless it returns true, so a host routes its own pages:

```ts
const services: EditorServices = {
  openLink: (href) => {
    if (!href.startsWith("/p/")) return false;
    router.push(href);
    return true;
  },
};
```

Hovering a link, or putting the caret into one, shows a card with the address and Open, Copy, Edit and Remove (Edit and Remove in editable editors only). The link dialog has one field for an address or, with `services.searchLinks`, a search; results show `title`, `detail` and an optional `icon` (an emoji) of each `LinkSuggestion`, and the arrow keys and Enter pick one.

Images open enlarged on click in a readonly editor, and from the zoom button of the image tools in an editable one. A collapsible block (`details`) hides its body while closed; its chevron opens and closes it, for a reader only for themselves.

## Live collaboration

Pass `collaboration` with the TipTap extensions that own the shared document; the package has no Yjs dependency of its own. Install them in the host:

```sh
bun add yjs y-websocket @tiptap/extension-collaboration @tiptap/extension-collaboration-caret @tiptap/y-tiptap
```

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { WysiwygEditor, type CollaborationOptions } from "@skevo18/vue-wysiwyg-component";

const props = defineProps<{ page: string; user: { name: string; color: string } }>();

const ydoc = new Y.Doc();
const provider = new WebsocketProvider("wss://example.com/yjs", props.page, ydoc);
const collaboration: CollaborationOptions = {
  extensions: [
    Collaboration.configure({ document: ydoc, field: "default" }),
    CollaborationCaret.configure({ provider, user: props.user }),
  ],
};
onBeforeUnmount(() => {
  provider.destroy();
  ydoc.destroy();
});

const markdown = ref("");
</script>

<template>
  <WysiwygEditor v-model="markdown" format="markdown" :collaboration="collaboration" />
</template>
```

`collaboration` is read once at mount, like `extensions`: to switch documents, remount the editor (`:key="page"`) with a new Y.Doc and provider. In collaboration mode:

- the content comes from the shared document; `modelValue` is neither loaded nor watched, but `update:modelValue` (the debounced serialized content) and `pending` are still emitted, so `v-model` mirrors the shared document. Seed an empty document with `handle.setContent(...)` once the provider has synced.
- the editor's own undo history is left out. Mod-z, Mod-Shift-z, Mod-y and the toolbar's undo/redo run the collaboration extension's `undo`/`redo`, which revert only this client's changes. `handle.setContent(value, { undoable: true })` is one undoable step; without `undoable` it stays out of the history.
- `draft` is ignored, and the markdown source mode and the compact field's expand dialog are unavailable.
- the slash menu, toolbar, bubble tools, gutter, node views, `readonly`, services and the `EditorHandle` work as usual.

`CollaborationCaret` carets and name labels are styled with the `--vc-*` tokens (`.collaboration-carets__caret`, `.collaboration-carets__label`); each user's color is set inline. Colors must be `#rrggbb`: CollaborationCaret draws any other color as transparent. To show an avatar before each name, pass `render: (user) => collaborationCaret({ name: user.name, color: user.color, avatar: user.avatar })`; the label is as wide as the full name, and an image (`.collaboration-carets__avatar`) that fails to load becomes a round initials badge (`.collaboration-carets__initials`).

## Notion blocks

Page editors can opt into Notion style blocks through `base`. Every flag is off by default, so mail and note editors keep their schema:

```vue
<WysiwygEditor v-model="page" :base="{ details: true, columns: true, bookmarks: true, embeds: true, toc: true, pageLinks: true, mentions: true, diagrams: true, math: true }" :services="services" />
```

| Flag | Nodes | Markdown |
|---|---|---|
| `columns` | `columns` > `column` (`width`: percent or null) | ```` ```columns ```` with one `==== <width>` section per column, `====` alone without a width |
| `details` | `details` gains `heading` (0 plain toggle, 1 to 4 toggle heading) | ```` ```details title="Setup" heading=2 open ```` |
| `bookmarks` | `bookmark` (`url title description image icon site`) | ```` ```bookmark url=… title="…" description="…" image=… icon=… site="…" ```` with an empty body |
| `embeds` | `embed` (`url src provider height`) | ```` ```embed url=… provider=youtube height=480 ```` (`src` is derived from `url` on every parse) |
| `toc` | `tableOfContents` (`color`) | ```` ```toc ```` |
| `pageLinks` | `pageLink` (`href title icon color`) | ```` ```page href=/p/<id> title="…" icon=📘 ```` |
| `mentions` | inline `mention` (`kind id label start end`) | `@[Ada](user:58501171)`, `@[Plan](page:<id>)`, `@[May 1, 2024](date:2024-05-01)`, `date:2024-05-01/2024-05-03`, `date:2024-05-01T10:00` |
| `diagrams` | code blocks in `mermaid` and `plantuml` (or the listed languages) | unchanged code fences |

A date mention's label is the fallback text the editor writes when a date is picked or edited. It is the date formatted with `Intl.DateTimeFormat(locale, { dateStyle: "medium" })`. A value with a time adds `, ` and the time formatted with `{ timeStyle: "short" }`. Every space in it is a plain U+0020. A range joins start and end with ` → ` (space, U+2192, space). The editor's locale is `en` unless the host sets one:

```md
@[May 1, 2024](date:2024-05-01)
@[May 1, 2024, 10:00 AM](date:2024-05-01T10:00)
@[May 1, 2024 → May 3, 2024](date:2024-05-01/2024-05-03)
@[May 1, 2024, 10:00 AM → May 3, 2024, 10:00 AM](date:2024-05-01T10:00/2024-05-03T10:00)
```

A range with a time gives the end the start's time. The editor shows the stored label as written, so a label from an importer or another locale stays until the date is edited.

Fence info values are written on one line: `"` and backticks become `'` in text values and are percent encoded in addresses. A `{color=…}` line right after the fence keeps the color of a `pageLink` or `tableOfContents` (`{color=blue_bg}`). Callouts keep an emoji and a color on the line after the quote:

```md
> [!NOTE] Heads up
> Body text.
{icon=💡 color=gray_bg}
```

Colors are the palette tokens `gray brown orange yellow green blue purple pink red` and the same names with `_bg` for backgrounds; they render through `--vc-color-<name>` and `--vc-bg-<name>`. Tables persist `colwidth` from dragging a column border and have a header column toggle; markdown stays a pipe table without either. A host fence rule of the same kind (an `embed` fence block, a `mermaid` block) wins over the base block.

Services used by these blocks, all optional:

- `openLink(href, event)`: return true when the host handled the click. Page links and page mentions otherwise navigate in the same tab, bookmarks open a new tab.
- `resolveLink(href)`: `{ title, icon?, href } | null`; page links and page mentions show it instead of their stored fallback.
- `searchMentions(query, kind, signal)`: `[{ kind, id, label, detail?, icon?, href? }]` for the `@` menu (people, pages; dates are built in) and the "Link to page" slash item (`kind` is `"page"`). A page without `href` links to `base.pageHref` (default `/p/{id}`).
- `linkPreview(url, signal)`: `{ title?, description?, image?, icon?, site? } | null` for bookmarks. Pasting a lone URL on an empty line offers to keep it as a link or turn it into a bookmark or an embed.
- `plantuml(source, signal)`: SVG markup. Without it diagrams load from `base.plantumlServer` (default `https://www.plantuml.com/plantuml`, `svg/<encoded>`) as an image.
- `katex`: without it, math loads KaTeX, its stylesheet and mhchem from this package on first use. Mermaid loads on first use too, with `securityLevel: "strict"` and the theme of the host's `--vc-bg`.

Embeds recognise YouTube, Vimeo, Loom, Figma, Gist, Google Maps, posts on X, CodePen and any other https page, and run in a sandboxed iframe (a page of the host's own origin loses `allow-same-origin`). While editing, a click selects the embed before the iframe takes input.

CSS hooks: `.wy-columns`, `.wy-column`, `.wy-column-resize`, `.wy-details[data-heading]`, `.wy-callout[data-color]`, `.wy-callout-emoji`, `.wy-bookmark`, `.wy-bookmark-card`, `.wy-embed`, `.wy-embed-overlay`, `.wy-toc`, `.wy-toc-item`, `.wy-page-link`, `.wy-mention.is-user|is-page|is-date`, `.wy-diagram`, `.wy-diagram-error`, `.wy-suggest` (the shared suggestion list).

## Floating toolbar tools in readonly editors

A readonly editor hides the floating toolbar, except for `bubble` tools marked `readonly: true`, which then show alone on a non-empty selection. Use it for actions that do not edit the document, such as commenting:

```ts
import { MessageSquare } from "@lucide/vue";
import { defineEditorExtension } from "@skevo18/vue-wysiwyg-component";

export const comments = defineEditorExtension({
  name: "comments",
  bubble: [{ id: "comment", label: "Comment", icon: MessageSquare, readonly: true, run: (editor) => openCommentThread(editor.state.selection) }],
});
```

## Version diffs

`DocDiffView` shows what changed between two versions of a document. It renders the newer version read-only with the editor's own blocks and node views (images, embeds, bookmarks, diagrams, tables, callouts, toggles and the host's blocks), marks added words and blocks green and keeps removed ones in place, struck through in red. A changed image, embed or diagram shows as the old one removed and the new one added. A moved block is tagged at both ends, and toggles with changes open.

```vue
<DocDiffView :before="olderJson" :after="newerJson" :extensions="extensions" :base="base" :services="services" @diff="(blocks) => (changed = diffHasChanges(blocks))" />
```

- `before`, `after`: ProseMirror JSON (`editor.getJSON()`), or strings in `format` (`json`, `markdown`, `html`). `before: null` shows `after` as wholly added. Nodes and marks the schema lacks are dropped.
- `extensions`, `base`, `services`, `locale`, `messages`: as on `WysiwygEditor`, so the host's nodes render.
- `diffDocs(before, after, { schema?, atomic? })` is the engine on its own. It returns `DiffBlock`s: blocks matched by longest common subsequence, alike blocks paired as modified with a word diff, containers diffed recursively, moves marked. `atomic(node)` names blocks compared whole (default: mermaid and plantuml code blocks).
- CSS hooks: `.wy-diff`, `.wy-diff-ins`, `.wy-diff-del`, `.wy-diff-block.wy-diff-added|wy-diff-removed`, `.wy-diff-moved` (its tag is `data-diff-label`), `.wy-diff-changed`.

## License

MIT
