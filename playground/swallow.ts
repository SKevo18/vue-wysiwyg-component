// A host block whose node view owns every event, like sansmemo's embedded database: drags over it never reach
// prosemirror, and its own link and input must not wake the editor's link card or keep a block focused.
import { defineComponent, h } from "vue";
import { NodeViewWrapper, VueNodeViewRenderer, nodeViewProps } from "@tiptap/vue-3";
import { Table2 } from "@lucide/vue";
import { defineFenceBlock, fenceAtom } from "@skevo18/vue-wysiwyg-component";

const SwallowView = defineComponent({
  props: nodeViewProps,
  setup() {
    return () =>
      h(NodeViewWrapper, { class: "wy-node pg-swallow" }, () =>
        h("div", { class: "pg-swallow-body", contenteditable: "false" }, [
          h("div", { class: "pg-swallow-head" }, [h("strong", "Embedded database"), h("a", { href: "/p/db", onClick: (e: MouseEvent) => e.preventDefault() }, "Open as page")]),
          h("input", { class: "wy-input", placeholder: "Filter rows" }),
          h("table", [h("tbody", [1, 2, 3].map((n) => h("tr", [h("td", `Row ${n}`), h("td", "Badger")])))]),
        ]),
      );
  },
});

const base = defineFenceBlock({
  kind: "swallow",
  formats: ["markdown"],
  slash: { group: "blocks", rank: 90, label: "Embedded database", description: "Swallows every event", icon: Table2 },
});

export const swallowBlock = {
  ...base,
  nodeViews: undefined,
  tiptap: [fenceAtom("swallowBlock", "swallow").extend({ addNodeView: () => VueNodeViewRenderer(SwallowView, { stopEvent: ({ event }) => event.target instanceof Element }) })],
};
