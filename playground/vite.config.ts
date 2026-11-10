import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [vue()],
  resolve: { alias: { "@skevo18/vue-wysiwyg-component": fileURLToPath(new URL("../src/index.ts", import.meta.url)) } },
  server: { port: Number(process.env.PORT ?? 15180), strictPort: true },
});
