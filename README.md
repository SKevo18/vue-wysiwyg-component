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

## Colours and underline

Markdown documents colour with a palette of nine names: `gray brown orange yellow green blue purple pink red`. A background colour is the name with `_bg` (`yellow_bg`). They render through CSS variables in `style.css`, `--vc-color-<name>` and `--vc-bg-<name>`, with Notion like muted values that switch to their dark variants when the host sets `color-scheme: dark`. Override them like the other `--vc-*` tokens.

| Markdown | Document |
|---|---|
| `++text++` | `underline` mark |
| `==text==` | `highlight` mark without a colour |
| `[text]{color=red}` | `textStyle` mark, `color: "red"` |
| `[text]{bg=yellow}` | `highlight` mark, `color: "yellow_bg"` (`bg=yellow_bg` is read too) |
| `[text]{color=red bg=yellow}` | both marks over the same text |

A colour wraps a link (`[[label](/p/1)]{color=red}`), since markdown-it reads no bracketed span inside a link label. Colours outside the palette are not written to markdown. html documents keep tiptap's `Color` and multicolour `Highlight`, which store any CSS colour as written (the html colour menu uses fixed values for mail clients).

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

## License

MIT
