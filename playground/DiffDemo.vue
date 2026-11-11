<script setup lang="ts">
import { ref, watch } from "vue";
import { DocDiffView } from "@skevo18/vue-wysiwyg-component";

const dark = ref(false);
watch(dark, (d) => document.documentElement.classList.toggle("dark", d));

const before = `# Badger census

Every spring the volunteers count the **active** setts, starting within one hour of dusk.

![North sett](/badger.svg)

\`\`\`embed url=https://www.youtube.com/watch?v=dQw4w9WgXcQ provider=youtube
\`\`\`

\`\`\`mermaid
graph LR
  sett --> hedge
  hedge --> quarry
\`\`\`

Bring a red torch and a notebook.

> [!NOTE] Safety
> Stay on the footpath.

- Walk the north hedge
- Check the old quarry
- Log the spoil heaps

| Sett | Holes |
| --- | --- |
| North hedge | 5 |
| Quarry | 3 |

\`\`\`bookmark url=https://example.com title="Example Domain" description="Field guide" site=example.com
\`\`\`

Report fresh bedding to the county recorder.
`;

const after = `# Badger census

Every spring the volunteers count the **active** setts, starting within thirty minutes of dusk.

![North sett](/badger-blue.svg)

\`\`\`embed url=https://www.youtube.com/watch?v=dQw4w9WgXcQ provider=youtube
\`\`\`

\`\`\`mermaid
graph LR
  sett --> hedge
  hedge --> stream
\`\`\`

> [!NOTE] Safety
> Stay on the footpath and keep dogs at home.

- Walk the north hedge and the ditch
- Log the badger paths
- Photograph the latrines

| Sett | Holes |
| --- | --- |
| North hedge | 7 |
| Quarry | 3 |

Report fresh bedding to the county recorder.

\`\`\`bookmark url=https://example.com title="Example Domain" description="Field guide" site=example.com
\`\`\`
`;

const base = { details: true, bookmarks: true, embeds: true, diagrams: true, math: true };
</script>

<template>
  <main class="diff-demo">
    <header><label><input v-model="dark" type="checkbox" /> Dark</label></header>
    <DocDiffView :before="before" :after="after" format="markdown" :base="base" />
  </main>
</template>

<style>
.diff-demo {
  max-width: 760px;
  margin: 2rem auto;
  padding: 0 2rem;
}
</style>
