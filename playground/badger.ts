import { defineFenceBlock } from "@skevo18/vue-wysiwyg-component";
import { PawPrint } from "@lucide/vue";
import BadgerView from "./BadgerView.vue";

export const badgerCensus = defineFenceBlock({
  kind: "census",
  view: BadgerView,
  ensureId: true,
  formats: ["markdown"],
  slash: { group: "blocks", rank: 80, label: "Badger census", description: "Count animals per sett", icon: PawPrint, attrs: { sett: "north" }, body: "badger: 3\notter: 1" },
});
