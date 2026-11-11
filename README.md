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

## Notion blocks (schema v3)

Page editors can opt into Notion style blocks through `base`. Every flag is off by default, so mail and note editors keep their schema:

```vue
<WysiwygEditor
  v-model="page"
  :base="{ details: true, columns: true, tabs: true, bookmarks: true, embeds: true, toc: true, breadcrumbs: true, buttons: true, ai: true, pageLinks: true, mentions: true, emoji: true, diagrams: true, math: true }"
  :services="services"
/>
```

| Flag | Node (kind) | Attributes | Markdown | HTML format |
|---|---|---|---|---|
| `columns` | `columns` > `column` (blocks) | `column.width`: percent or null | ```` ```columns ```` with one `==== <width>` section per column, `====` alone without a width | `div[data-type=columns]` > `div[data-type=column][data-width]` |
| `tabs` | `tabs` > `tab` (blocks) | `tab.label` | ```` ```tabs ```` with one `==== <label>` section per tab, `====` alone without a label | `div[data-tabs]` > `div[data-tab][data-label]`, every tab shown |
| `details` | `details` (blocks), slash "Toggle list" | `title`, `open`, `heading` (0 plain toggle, 1 to 4 toggle heading) | ```` ```details title="Setup" heading=2 open ```` | `details` > `summary` |
| `bookmarks` | `bookmark` (atom) | `url title description image icon site` | ```` ```bookmark url=… title="…" description="…" image=… icon=… site="…" ```` with an empty body | link card |
| `embeds` | `embed` (atom) | `url src provider height` | ```` ```embed url=… provider=youtube height=480 ```` (`src` is derived from `url` on every parse) | sandboxed iframe |
| `toc` | `tableOfContents` (atom) | `color` | ```` ```toc ```` | empty `nav[data-type=toc]` |
| `breadcrumbs` | `breadcrumbs` (atom) | none | ```` ```breadcrumbs ```` with an empty body | empty `nav[data-type=breadcrumbs]` for the host to fill |
| `buttons` | `button` (atom) | `label`, `actions` (array of `{ kind, … }`) | ```` ```button label="Add task" ```` whose body is the actions as JSON (`JSON.stringify(actions, null, 2)`, no body without actions) | `div[data-type=button][data-label][data-actions]` holding an inert `button` |
| `ai` | `aiBlock` (blocks) | `prompt`, `scope`, `updatedAt` (ISO or "") | ```` ```ai prompt="…" scope=<id> updated=<iso> ```` whose body is the generated markdown | `div[data-type=ai-block][data-prompt][data-scope][data-updated]` with the content |
| `pageLinks` (default: `mentions`) | `pageLink` (inline atom) | `href`, `title` (fallback text), `icon` (fallback emoji or "") | `@[Title](href)`, see below | `a[data-type=page-link][href]` |
| `mentions` | `mention` (inline atom) | `kind` (`user` or `date`), `id`, `label`, `start`, `end`, `remind` | `@[Ada](user:58501171)`, `@[May 1, 2024](date:2024-05-01)`, see below | `span[data-type=mention][data-kind]` |
| `emoji` | none | none | emoji are text | text |
| `diagrams` | code blocks in `mermaid` and `plantuml` (or the listed languages) | | unchanged code fences | |

### Inline page links and mentions

Both are chips: the caret steps over them with the arrow keys, Backspace after one or Delete before one removes it, and text types before and after them like after any character.

`pageLink` is written `@[Title](href)`. `href` starts with `/` (not `//`), `http://`, `https://` or `page:`; spaces, `(`, `)` and `\` in it are percent encoded. `[`, `]` and `\` in the title are escaped with a backslash, a line break becomes a space. A click calls `services.openLink(href, event)`; without it, or when it returns false, a path opens in this tab and an address in a new one. `page:<id>` links to `base.pageHref` with the id (default `/p/{id}`), so a host can map ids itself. `services.resolveLink(href)` supplies the shown title and icon; `title` and `icon` are only the fallbacks stored when the link was inserted.

Older documents keep working:

- the block fence ```` ```page href=/p/<id> title="…" icon=📘 ```` becomes a paragraph holding one `pageLink` (written back as `@[…](…)`). A `{color=…}` line after the fence colors that paragraph.
- a page mention `@[Plan](page:<id>)` becomes a `pageLink` with href `page:<id>`.
- html `div[data-type=page-link]` and `a[data-type=mention][data-kind=page]` parse as `pageLink`.

`mention` keeps people and dates:

```md
@[Ada Lovelace](user:58501171)
@[May 1, 2024](date:2024-05-01)
@[May 1, 2024, 10:00 AM](date:2024-05-01T10:00)
@[May 1, 2024 → May 3, 2024](date:2024-05-01/2024-05-03)
@[May 1, 2024, 9:00 AM](date:2024-05-01T09:00!)
```

A target is `user:<id>` (no spaces, parentheses or backslashes) or `date:<start>[/<end>]` where a value is `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM[:SS]`. A trailing `!` marks a reminder (`remind: true`), which shows a bell. The label is the fallback text the editor writes when a date is picked or edited: the date formatted with `Intl.DateTimeFormat(locale, { dateStyle: "medium" })`, a value with a time adds `, ` and the time formatted with `{ timeStyle: "short" }`, every space is a plain U+0020, and a range joins start and end with ` → ` (space, U+2192, space). A range with a time gives the end the start's time. The editor shows the stored label as written.

The `@` menu lists people and pages from `services.searchMentions` and dates. Dates come from English phrases, also with spaces: `today`, `tomorrow`, `yesterday`, weekday names (`friday` is the coming one, today included; `next friday` the one in the week after this one, weeks start on Monday), `next week` (next Monday), `in 3 days`, `in a week`, `in 2 months`, `dec 24`, `1st of may 2027`, `2024-05-01`, each with an optional time (`9am`, `9:30 pm`, `14:30`, `noon`, `midnight`, `at 5pm`). `remind me` in front makes a reminder. `parseNaturalDate(text, now?)` is exported. Slash items: "Link to page" (needs `services.searchMentions`), "Mention a person" (needs `services.searchMentions`) and "Date or reminder" all insert at the caret.

### Emoji

`base.emoji` turns on the `:` suggestion (`:smi` lists matches from two letters on), `:shortcode:` replacement as you type (GitHub shortcodes) and the slash item "Emoji", which opens the full picker. The picker (search, categories, skin tone, recently used, all kept in `localStorage`) is exported as `EmojiPicker` (`<EmojiPicker @pick="…" />`, optional `t` translator and a `footer` slot) and is also the callout icon picker. Emoji data is emojibase, loaded on first use as its own chunk; nothing is fetched from a CDN. `loadEmoji()` and `searchEmoji(data, query)` are exported.

### Blocks

- Tabs: the strip shows one tab at a time, the shown tab follows the caret, and the move, delete and add tools show on hover or while the caret is inside.
- Button: a click runs the actions in order. Base kinds: `{ kind: "insert", markdown }` inserts the markdown below the button, `{ kind: "link", url }` opens it like a link. A readonly editor skips actions that edit. Edit (in the tools on hover) shows the label and the action list.
- Breadcrumbs: the trail from `services.breadcrumbs()`; a click opens a crumb like a page link.
- AI block: the instruction field, the scope select (`services.aiScopes`) and Generate, Regenerate or Stop show while the block is edited or has no instruction yet. The streamed markdown replaces the block's content as it arrives; the content stays ordinary editable blocks. The whole generation is one undo step. Done, or a click away, folds the instruction away. The slash item needs `services.aiGenerate`.

### Services

All optional:

- `openLink(href, event)`: return true when the host handled the click. Page links otherwise navigate in the same tab, bookmarks open a new tab.
- `resolveLink(href)`: `{ title, icon?, href } | null`; page links show it instead of their stored fallback.
- `searchMentions(query, kind, signal)`: `[{ kind, id, label, detail?, icon?, href? }]` for the `@` menu (people, pages), "Link to page" (`kind` is `"page"`) and "Mention a person" (`kind` is `"user"`). A page without `href` links to `base.pageHref`.
- `breadcrumbs()`: `[{ title, icon?, href }]`, outermost first.
- `buttonActions`: `Record<kind, ButtonActionDef>`, more action kinds: `{ label, icon?, fields?: [{ key, label, placeholder?, multiline? }], readonly?, run(action, { editor, pos, services, event }) }`. `fields` are the text inputs of the action in the button editor; `readonly: false` skips it in readonly editors. A host kind cannot replace `insert` or `link`.
- `aiGenerate({ prompt, scope, document }, signal)`: an `AsyncIterable<string>` of markdown pieces; `document` is the markdown of the whole document. Stop aborts `signal`.
- `aiScopes`: `[{ id, label }]`; the first is the default scope of a new AI block.
- `linkPreview(url, signal)`: `{ title?, description?, image?, icon?, site? } | null` for bookmarks. Pasting a lone URL on an empty line offers to keep it as a link or turn it into a bookmark or an embed.
- `plantuml(source, signal)`: SVG markup. Without it diagrams load from `base.plantumlServer` (default `https://www.plantuml.com/plantuml`, `svg/<encoded>`) as an image.
- `katex`: without it, math loads KaTeX, its stylesheet and mhchem from this package on first use. Mermaid loads on first use too, with `securityLevel: "strict"` and the theme of the host's `--vc-bg`.

### Your own inline blocks

`defineInlineBlock` builds a chip-like inline atom with the same caret handling, an optional Vue view and an optional inline markdown syntax. Wrap the view in the exported `InlineChip` for the shared chip look and selection outline:

```ts
import { defineInlineBlock } from "@skevo18/vue-wysiwyg-component";
import BlankView from "./BlankView.vue";

export const quizBlank = defineInlineBlock({
  name: "quizBlank",
  attrs: { answer: "", width: 0 },
  text: (a) => `[${a.answer}]`,
  view: BlankView,
  markdown: {
    // tried where markdown-it stops for a special character, so it starts with one (`{`, `@`, `[`, `:` …)
    pattern: /\{\{([^{}\n]+)\}\}/,
    parse: (m) => ({ answer: m[1]!.trim() }),
    serialize: (a) => `{{${a.answer}}}`,
  },
});
```

```vue
<!-- BlankView.vue -->
<script setup lang="ts">
import { nodeViewProps } from "@tiptap/vue-3";
import { InlineChip } from "@skevo18/vue-wysiwyg-component";
defineProps(nodeViewProps);
</script>
<template>
  <InlineChip :selected="selected"><span class="blank">{{ node.attrs.answer }}</span></InlineChip>
</template>
```

Attributes keep their default's type and render in html as `data-<kebab-name>`; the node renders as `span[data-type=<kebab-name>]` (an `a` when `html.href` returns an address) holding `text(attrs)`. Options: `html.class`, `html.href`, `html.parse` (more parse rules), `markdown.before` (the markdown-it rule it runs before, default `link`), `slash`, `tiptap` (more extensions), `formats`, `messages`. `inlineChipKeys(name)` gives an existing inline node the same keys; `escapeChipLabel`, `unescapeChipLabel` and `AT_LINK` help with `@[label](target)` style syntaxes. A fence rule can turn a fence into a paragraph holding one chip with `ctx.inline(inlineBlockToken(name), attrs)`.

### Code blocks

`codeBlock` has the attributes `language` and `meta`, the fence info words after the language (```` ```js title="app.js" ```` gives `meta` `title="app.js"`), kept as written. Long lines wrap by default. The word `nowrap` in `meta` keeps the lines unwrapped with a horizontal scroll bar:

````md
```js nowrap title="app.js"
const otters = await fetch("/api/otters?include=dens,rivers,families&sort=age").then((r) => r.json());
```
````

Grammar: ```` ```<language> [nowrap] [<other words>] ````. `nowrap` is a whole word anywhere in the info after the language; the editor writes it first after the language. The first info word is always the language, so a block without one that keeps info words is written as ```` ```text nowrap ````. Mermaid and PlantUML blocks ignore it. The "Wrap lines" checkbox in the block menu and the command `editor.commands.toggleCodeWrap()` (the code block at the selection) switch it. In the html format a nowrap block renders as `<pre data-nowrap>` (the other words stay in `data-meta`), and the html output wraps `pre` unless it has `data-nowrap`.

Hosts reading or writing fences themselves use the exported helpers on the info after the language: `codeWraps(meta)` is false when `meta` holds the word `nowrap`; `setCodeWrap(meta, wrap)` returns `meta` without `nowrap` when `wrap` is true and with `nowrap` leading the other words when it is false. Other readers match the same rule: split the info at the first whitespace, the rest is `meta`, and the block is unwrapped when `meta` contains `nowrap` delimited by whitespace or the ends.

### Notes

Fence info values are written on one line: `"` and backticks become `'` in text values and are percent encoded in addresses. A `{color=…}` line right after the fence keeps the color of a `tableOfContents` (`{color=blue_bg}`). Callouts keep an emoji and a color on the line after the quote:

```md
> [!NOTE] Heads up
> Body text.
{icon=💡 color=gray_bg}
```

Colors are the palette tokens `gray brown orange yellow green blue purple pink red` and the same names with `_bg` for backgrounds; they render through `--vc-color-<name>` and `--vc-bg-<name>`. Tables persist `colwidth` from dragging a column border and have a header column toggle; markdown stays a pipe table without either. A host fence rule of the same kind (an `embed` fence block, a `mermaid` block) wins over the base block.

Embeds recognise YouTube, Vimeo, Loom, Figma, Gist, Google Maps, posts on X, CodePen and any other https page, and run in a sandboxed iframe (a page of the host's own origin loses `allow-same-origin`). While editing, a click selects the embed before the iframe takes input.

CSS hooks: `.wy-columns`, `.wy-column`, `.wy-column-resize`, `.wy-tabs`, `.wy-tab`, `.wy-tab-panel`, `.wy-details[data-heading]`, `.wy-callout[data-color]`, `.wy-callout-emoji`, `.wy-bookmark`, `.wy-bookmark-card`, `.wy-embed`, `.wy-embed-overlay`, `.wy-toc`, `.wy-toc-item`, `.wy-breadcrumbs`, `.wy-breadcrumb`, `.wy-button`, `.wy-ai-block`, `.wy-ai-panel`, `.wy-page-link`, `.wy-mention.is-user|is-date|is-reminder|is-overdue`, `.wy-chip-atom`, `.wy-emoji-picker`, `.wy-diagram`, `.wy-diagram-error`, `.wy-suggest` (the shared suggestion list).

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
