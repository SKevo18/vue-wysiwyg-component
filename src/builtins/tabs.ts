// Tabs (```` ```tabs ```` with one `==== label` section per tab), the syntax of poznamkovac's notes: one tab shown
// at a time, chosen in the strip. html keeps every tab as a `div[data-tab]` with its label, shown one after another
import { Node, mergeAttributes } from "@tiptap/core";
import { PanelsTopLeft } from "@lucide/vue";
import TabsView from "../nodes/TabsView.vue";
import TabView from "../nodes/TabView.vue";
import type { EditorExtension } from "../types";
import { TabsActive, sectionNode } from "./sections";

export const Tabs = Node.create({
  name: "tabs",
  group: "block",
  content: "tab+",
  defining: true,
  draggable: false,
  parseHTML() {
    return [{ tag: "div[data-tabs]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-tabs": "", class: "wy-tabs" }, HTMLAttributes), 0];
  },
});

export const Tab = sectionNode("tab");

export const tabsExtension: EditorExtension = {
  name: "tabs",
  tiptap: [Tabs, Tab, TabsActive],
  nodeViews: { tabs: TabsView, tab: TabView },
  markdown: {
    fences: [{ kind: "tabs", parse: (c) => c.sections("tabs", "tab", {}) }],
    tokens: {
      tabs: { block: "tabs" },
      tab: { block: "tab", getAttrs: (tok) => ({ label: tok.meta?.label ?? "" }) },
    },
    nodes: {
      tabs: (state, node, _parent, _index, h) => h.writeFence(state, node, "tabs", h.sectionsMarkdown(node)),
      // written by their tabs parent
      tab() {},
    },
  },
  slash: [{ id: "tabs", group: "blocks", rank: 16, label: "", icon: PanelsTopLeft, keywords: "tabs tabbed sections", run: (c) => c.insertSections("tabs", "tab") }],
  convert: {
    sections: { tabs: "tab" },
    targets: [{ id: "tabs", label: "", icon: PanelsTopLeft, rank: 39, container: "tabs" }],
  },
};
