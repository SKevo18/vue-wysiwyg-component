<script setup lang="ts">
import { ref, watch } from "vue";
import { MessageSquare } from "@lucide/vue";
import { WysiwygEditor, defineEditorExtension, type EditorServices } from "@skevo18/vue-wysiwyg-component";
import { badgerCensus } from "./badger";
import { collaborators } from "./collab";
import { swallowBlock } from "./swallow";

const notionExtensions = [swallowBlock];

const dark = ref(false);
watch(dark, (d) => document.documentElement.classList.toggle("dark", d));
const toolbar = ref<"fixed" | "floating" | "both">("fixed");
const readonly = ref(false);
const slovak = ref(false);
// sansmemo's page canvas: no surface padding, the handles hang in the page margin
const flush = ref(false);
const log = ref<string[]>([]);

const PAGES = [
  { href: "/notes/setts", title: "Badger setts", detail: "Field notes, updated yesterday", icon: "🦡" },
  { href: "/notes/otters", title: "Otter holts along the river and their seasonal use", detail: "Wildlife survey 2026, river section north of the old mill bridge", icon: "🦦" },
  { href: "/notes/foxes", title: "Fox earths", detail: "Burrows" },
];
const services: EditorServices = {
  upload: async (file) => {
    await new Promise((r) => setTimeout(r, 300));
    return { url: URL.createObjectURL(file), name: file.name, size: file.size, type: file.type };
  },
  searchLinks: async (q, signal) => {
    await new Promise((r) => setTimeout(r, 400));
    if (signal.aborted) return [];
    return PAGES.filter((p) => `${p.title} ${p.detail}`.toLowerCase().includes(q.toLowerCase()));
  },
  openLink: (href) => {
    if (!href.startsWith("/")) return false;
    log.value.unshift(`open internal ${href}`);
    return true;
  },
  toast: (m, k) => log.value.unshift(`${k}: ${m}`),
  askAi: (r) => log.value.unshift(`ask ai: ${r.selection}`),
};

const NOTION_PAGES = [
  { id: "handbook", label: "Sansec handbook", icon: "📘", detail: "Workspace" },
  { id: "onboarding", label: "Onboarding", icon: "🧭", detail: "Handbook" },
  { id: "security", label: "Security policy", icon: "🛡️", detail: "Handbook" },
];
const USERS = [
  { id: "58501171", label: "Ada Lovelace", detail: "ada@example.com" },
  { id: "1", label: "Bob Badger", detail: "bob@example.com" },
];
const notionServices: EditorServices = {
  ...services,
  openLink: (href) => {
    log.value.unshift(`open ${href}`);
    return href.startsWith("/");
  },
  resolveLink: async (href) => {
    const page = NOTION_PAGES.find((p) => href === `/p/${p.id}`);
    return page ? { href, title: page.label, icon: page.icon } : null;
  },
  searchMentions: async (q, kind) => {
    await new Promise((r) => setTimeout(r, 150));
    const match = (l: string) => l.toLowerCase().includes(q.toLowerCase());
    const pages = NOTION_PAGES.filter((p) => match(p.label)).map((p) => ({ kind: "page" as const, ...p }));
    const users = kind === "page" ? [] : USERS.filter((u) => match(u.label)).map((u) => ({ kind: "user" as const, ...u }));
    return [...users, ...pages];
  },
  linkPreview: async () => {
    await new Promise((r) => setTimeout(r, 300));
    return { title: "Example Domain", description: "This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.", site: "example.com" };
  },
};
const notionBase = { math: true, details: true, columns: true, bookmarks: true, embeds: true, toc: true, pageLinks: true, mentions: true, diagrams: true };
const notionMd = ref(`# Handbook

\`\`\`toc
\`\`\`

## Columns

\`\`\`columns
==== 40
> [!NOTE] Heads up
> Callout with an emoji and a background.
{icon=💡 color=yellow_bg}

==== 60
Ask @[Ada Lovelace](user:58501171) about @[Onboarding](page:onboarding) on @[May 1, 2024](date:2024-05-01).

- one
- two
\`\`\`

\`\`\`details title="Toggle heading" heading=2 open
Hidden until opened.
\`\`\`

## Links

\`\`\`page href=/p/security title="Security policy" icon=🛡️
\`\`\`

\`\`\`bookmark url=https://example.com title="Example Domain" description="This domain is for use in illustrative examples in documents." site=example.com
\`\`\`

\`\`\`embed url=https://www.youtube.com/watch?v=dQw4w9WgXcQ provider=youtube
\`\`\`

\`\`\`js
console.log("otter")
\`\`\`

\`\`\`swallow
\`\`\`

## Diagrams

\`\`\`mermaid
graph LR
  A[Write] --> B{Review}
  B -->|ok| C[Ship]
  B -->|no| A
\`\`\`

\`\`\`plantuml
@startuml
Bob -> Alice : hello
@enduml
\`\`\`

Formula $\\ce{H2O}$ and $e^{i\\pi} = -1$.

| Name | Role |
| --- | --- |
| Ada | Math |
`);
const extensions = [badgerCensus];
const comments = defineEditorExtension({ name: "comments", bubble: [{ id: "comment", label: "Comment", icon: MessageSquare, readonly: true, run: () => log.value.unshift("comment") }] });
const fullExtensions = [badgerCensus, comments];

const fullMd = ref(`# Badger notes

Badgers dig **setts** with ==many== tunnels, [red earth]{color=red}, [marked]{bg=yellow} and [both]{color=blue bg=pink}, ++underlined++ and $e^{i\\pi} = -1$. See [setts](/notes/setts) or [the wiki](https://en.wikipedia.org/wiki/Badger).

A gray note on its own.
{color=gray_bg}

## Blue heading
{color=blue}

> [!TIP] Field tip
> Visit at dusk.

- [ ] count otters
  {color=green}
- [x] count badgers

\`\`\`details title="Den sizes"
Larger setts have up to fifty entrances.
\`\`\`

![A badger](/badger.svg "European badger"){width=50%}

| Sett | Badgers |
| :--- | ---: |
| North | 3 |

\`\`\`python
print("otter")
\`\`\`

\`\`\`census id=demo0001 sett=north
badger: 3
otter: 1
\`\`\`
`);
const compactMd = ref("A **short** comment about otters.");
const fullHtml = ref('<h2>Hello otters</h2><p style="text-align: center"><span style="color: #dc2626">Red</span> and <mark data-color="#bbf7d0" style="background-color: #bbf7d0">green</mark>.</p><div data-type="callout" data-variant="warning"><p>Cold water.</p></div>');
const compactHtml = ref("<p>Reply to the <strong>badger</strong> club.</p>");
const [ada, bob] = collaborators([
  { name: "Ada Lovelace-Byron", color: "#e5484d", avatar: "https://example.invalid/ada.png" },
  { name: "Bob", color: "#0090ff" },
]);
const adaMd = ref("");
const bobMd = ref("");
</script>

<template>
  <main class="pg" :class="{ 'pg-flush': flush }">
    <header class="pg-head">
      <h1>vue-wysiwyg-component</h1>
      <div class="pg-controls">
        <label>toolbar <select v-model="toolbar" data-testid="toolbar-mode"><option>fixed</option><option>floating</option><option>both</option></select></label>
        <label><input v-model="readonly" type="checkbox" /> readonly</label>
        <label><input v-model="slovak" type="checkbox" /> sk</label>
        <label><input v-model="flush" type="checkbox" data-testid="flush" /> page margins</label>
        <label><input v-model="dark" type="checkbox" /> dark</label>
      </div>
    </header>
    <section>
      <h2>Full, markdown</h2>
      <WysiwygEditor :key="`${toolbar}-${slovak}`" v-model="fullMd" size="full" :toolbar="toolbar" :readonly="readonly" :locale="slovak ? 'sk' : 'en'" :extensions="fullExtensions" :services="services" :base="{ math: true, details: true, footnotes: true }" focus-mode source-mode @save="log.unshift('save')" />
      <pre class="pg-out" data-testid="full-md">{{ fullMd }}</pre>
    </section>
    <section>
      <h2>Notion blocks</h2>
      <WysiwygEditor v-model="notionMd" size="full" :services="notionServices" :base="notionBase" :extensions="notionExtensions" />
      <pre class="pg-out" data-testid="notion-md">{{ notionMd }}</pre>
    </section>
    <section>
      <h2>Compact, markdown</h2>
      <WysiwygEditor v-model="compactMd" size="compact" :extensions="extensions" :services="services" :min-rows="3" placeholder="Write a comment" @submit="log.unshift('submit')" />
      <pre class="pg-out" data-testid="compact-md">{{ compactMd }}</pre>
    </section>
    <section>
      <h2>Full, html</h2>
      <WysiwygEditor v-model="fullHtml" format="html" size="full" :services="services" :shortcuts="['Mod-Shift-b']" @shortcut="(k) => log.unshift(k)" />
      <pre class="pg-out" data-testid="full-html">{{ fullHtml }}</pre>
    </section>
    <section>
      <h2>Compact, html</h2>
      <WysiwygEditor v-model="compactHtml" format="html" size="compact" :services="services" placeholder="Reply" />
      <pre class="pg-out" data-testid="compact-html">{{ compactHtml }}</pre>
    </section>
    <section>
      <h2>Live collaboration, two peers on one document</h2>
      <div class="pg-pair">
        <WysiwygEditor v-model="adaMd" size="full" :collaboration="ada" placeholder="Ada writes here" />
        <WysiwygEditor v-model="bobMd" size="full" :collaboration="bob" placeholder="Bob writes here" />
      </div>
      <pre class="pg-out" data-testid="collab-md">{{ bobMd }}</pre>
    </section>
    <pre class="pg-out">{{ log.slice(0, 8).join("\n") }}</pre>
  </main>
</template>
