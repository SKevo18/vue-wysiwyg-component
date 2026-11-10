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

## License

MIT
