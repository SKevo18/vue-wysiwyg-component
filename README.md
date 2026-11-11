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
