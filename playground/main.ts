import { createApp } from "vue";
import "katex/dist/katex.min.css";
import { createWysiwyg } from "@skevo18/vue-wysiwyg-component";
import App from "./App.vue";
import "./playground.css";

createApp(App).use(createWysiwyg({ locale: "en" })).mount("#app");
