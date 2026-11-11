// Breadcrumbs (```` ```breadcrumbs ````): the trail of pages above this one from `services.breadcrumbs`. html keeps an
// empty `nav[data-type="breadcrumbs"]` the host may fill
import { Node, mergeAttributes } from "@tiptap/core";
import { ChevronsRight } from "@lucide/vue";
import BreadcrumbsView from "../nodes/BreadcrumbsView.vue";
import type { EditorExtension } from "../types";

export const Breadcrumbs = Node.create({
  name: "breadcrumbs",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  parseHTML() {
    return [{ tag: 'nav[data-type="breadcrumbs"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["nav", mergeAttributes({ "data-type": "breadcrumbs", class: "wy-breadcrumbs" }, HTMLAttributes)];
  },
});

export const breadcrumbsExtension: EditorExtension = {
  name: "breadcrumbs",
  tiptap: [Breadcrumbs],
  nodeViews: { breadcrumbs: BreadcrumbsView },
  markdown: {
    fences: [{ kind: "breadcrumbs", parse: (ctx) => ctx.atom("breadcrumbs_block", {}) }],
    tokens: { breadcrumbs_block: { node: "breadcrumbs" } },
    nodes: {
      breadcrumbs(state, node, _parent, _index, h) {
        h.writeFence(state, node, "breadcrumbs", "");
      },
    },
  },
  slash: [
    {
      id: "breadcrumbs",
      group: "blocks",
      rank: 42,
      label: "",
      icon: ChevronsRight,
      keywords: "breadcrumbs path parent navigation trail",
      enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.breadcrumbs,
      run: (c) => c.insert("breadcrumbs", {}),
    },
  ],
};
