// AI blocks (```` ```ai prompt="…" scope=… updated=… ```` whose body is the generated markdown): an instruction
// and a scope above ordinary blocks that `services.aiGenerate` writes. html keeps the content in
// `div[data-type="ai-block"]` with the instruction, scope and time as data attributes
import { Node, mergeAttributes } from "@tiptap/core";
import { Sparkles } from "@lucide/vue";
import AiBlockView from "../nodes/AiBlockView.vue";
import { formatInfo } from "../core/info";
import type { EditorExtension } from "../types";
import { infoText } from "./fenceText";

function dataAttr(name: string, data: string) {
  return {
    default: "",
    parseHTML: (dom: HTMLElement) => dom.getAttribute(data) ?? "",
    renderHTML: (a: Record<string, unknown>) => (a[name] ? { [data]: String(a[name]) } : {}),
  };
}

export const AiBlock = Node.create({
  name: "aiBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: false,
  addAttributes() {
    return { prompt: dataAttr("prompt", "data-prompt"), scope: dataAttr("scope", "data-scope"), updatedAt: dataAttr("updatedAt", "data-updated") };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="ai-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "ai-block", class: "wy-ai-block" }, HTMLAttributes), 0];
  },
});

export const aiExtension: EditorExtension = {
  name: "aiBlock",
  tiptap: [AiBlock],
  nodeViews: { aiBlock: AiBlockView },
  markdown: {
    fences: [
      {
        kind: "ai",
        parse: (ctx) => {
          const a = ctx.info.attrs;
          ctx.container("ai_block", { prompt: a.prompt ?? "", scope: a.scope ?? "", updatedAt: a.updated ?? "" });
        },
      },
    ],
    tokens: { ai_block: { block: "aiBlock", getAttrs: (tok) => ({ prompt: tok.meta.prompt, scope: tok.meta.scope, updatedAt: tok.meta.updatedAt }) } },
    nodes: {
      aiBlock(state, node, _parent, _index, h) {
        const a = node.attrs as { prompt: string; scope: string; updatedAt: string };
        h.writeFence(state, node, formatInfo("ai", { prompt: infoText(a.prompt), scope: infoText(a.scope).replace(/\s/g, ""), updated: infoText(a.updatedAt).replace(/\s/g, "") }), h.contentMarkdown(node));
      },
    },
  },
  slash: [
    {
      id: "aiBlock",
      group: "blocks",
      rank: 5,
      label: "",
      icon: Sparkles,
      keywords: "ai assistant generate write summarize",
      enabled: (editor) => !!editor.storage.wysiwyg?.context?.services.aiGenerate,
      run: (c) => c.insert("aiBlock", { prompt: "", scope: c.services.aiScopes?.[0]?.id ?? "", updatedAt: "" }, [{ type: "paragraph" }]),
    },
  ],
};
