import { createApp } from "vue";
import { createWysiwyg } from "@skevo18/vue-wysiwyg-component";
import DiffDemo from "./DiffDemo.vue";
import "./playground.css";

createApp(DiffDemo).use(createWysiwyg({ locale: "en" })).mount("#app");
