<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { isDarkTheme, plantumlUrl, renderMermaid, watchTheme } from "../core/diagrams";
import type { DiagramLanguage, EditorServices } from "../types";

const props = defineProps<{ language: DiagramLanguage; source: string; server: string; services: EditorServices; t: (key: string) => string }>();

const root = ref<HTMLElement | null>(null);
const svg = ref("");
const img = ref("");
const error = ref("");
const loading = ref(true);
let timer = 0;
let abort: AbortController | null = null;
let blobUrl = "";
let run = 0;

function setImage(url: string, blob = false) {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = blob ? url : "";
  img.value = url;
}

async function render() {
  const id = ++run;
  const source = props.source.trim();
  abort?.abort();
  if (!source) {
    svg.value = "";
    setImage("");
    error.value = "";
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    if (props.language === "mermaid") {
      const out = await renderMermaid(source, isDarkTheme(root.value));
      if (id !== run) return;
      svg.value = out;
      error.value = "";
    } else if (props.services.plantuml) {
      const ctrl = (abort = new AbortController());
      const markup = await props.services.plantuml(source, ctrl.signal);
      if (id !== run) return;
      // an <img> never runs scripts inside the svg
      setImage(URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" })), true);
      error.value = "";
    } else {
      const url = await plantumlUrl(props.server, source);
      if (id !== run) return;
      setImage(url);
      error.value = "";
    }
  } catch (e) {
    if (id !== run) return;
    svg.value = "";
    setImage("");
    error.value = (e instanceof Error ? e.message : String(e)).split("\n").slice(0, 6).join("\n") || props.t("diagram.failed");
  } finally {
    if (id === run) loading.value = false;
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void render(), 300);
}

watch(() => [props.source, props.language], schedule);
let stopTheme = () => {};
onMounted(() => {
  void render();
  if (props.language === "mermaid") stopTheme = watchTheme(schedule);
});
onBeforeUnmount(() => {
  run++;
  window.clearTimeout(timer);
  abort?.abort();
  stopTheme();
  setImage("");
});
</script>

<template>
  <div ref="root" class="wy-diagram" :class="{ 'is-loading': loading && !svg && !img }" :data-language="language">
    <div v-if="error" class="wy-diagram-error" role="alert">{{ error }}</div>
    <div v-else-if="svg" class="wy-diagram-svg" v-html="svg"></div>
    <img v-else-if="img" class="wy-diagram-img" :src="img" :alt="t('diagram.alt')" @error="error = t('diagram.failed')" />
    <p v-else-if="loading" class="wy-diagram-hint">{{ t("diagram.loading") }}</p>
    <p v-else class="wy-diagram-hint">{{ t("diagram.empty") }}</p>
  </div>
</template>
