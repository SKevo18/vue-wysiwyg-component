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

`CollaborationCaret` carets and name labels are styled with the `--vc-*` tokens (`.collaboration-carets__caret`, `.collaboration-carets__label`); each user's color is set inline. Colors must be `#rrggbb`: CollaborationCaret draws any other color as transparent. To show an avatar before each name, pass `render: (user) => collaborationCaret({ name: user.name, color: user.color, avatar: user.avatar })`; the image (`.collaboration-carets__avatar`) is left out when it fails to load.

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

## Bubble tools in readonly editors

A readonly editor hides the selection bubble, except for bubble tools marked `readonly: true`, which then show alone on a non-empty selection. Use it for actions that do not edit the document, such as commenting:

```ts
import { MessageSquare } from "@lucide/vue";
import { defineEditorExtension } from "@skevo18/vue-wysiwyg-component";

export const comments = defineEditorExtension({
  name: "comments",
  bubble: [{ id: "comment", label: "Comment", icon: MessageSquare, readonly: true, run: (editor) => openCommentThread(editor.state.selection) }],
});
```

## License

MIT
