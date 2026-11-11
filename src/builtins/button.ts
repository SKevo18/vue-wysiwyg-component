// Buttons (```` ```button label="…" ```` with the JSON array of actions as body): a click runs the actions in order.
// base kinds insert a markdown template below the button or open a link; hosts add kinds through
// `services.buttonActions`. html keeps the block as `div[data-type="button"]` with its label and actions
import { Node, mergeAttributes } from "@tiptap/core";
import { Link, MousePointerClick, TextCursorInput } from "@lucide/vue";
import ButtonView from "../nodes/ButtonView.vue";
import { formatInfo } from "../core/info";
import { openHref } from "../editor/behaviour";
import { contextOf } from "../editor/context";
import type { ButtonAction, ButtonActionDef, EditorExtension } from "../types";
import { infoText } from "./fenceText";

function isAction(v: unknown): v is ButtonAction {
  return !!v && typeof v === "object" && !Array.isArray(v) && "kind" in v && typeof v.kind === "string" && v.kind !== "";
}

/** the actions of a fence body or `data-actions`; anything that is not a JSON array of `{ kind }` objects is none */
export function parseButtonActions(json: string): ButtonAction[] {
  try {
    const v: unknown = JSON.parse(json.trim() || "[]");
    return Array.isArray(v) ? v.filter(isAction) : [];
  } catch {
    return [];
  }
}

/** the fence body: the actions as JSON indented by two spaces, nothing without actions */
export function formatButtonActions(actions: readonly ButtonAction[]): string {
  return actions.length ? JSON.stringify(actions, null, 2) : "";
}

export const BASE_BUTTON_ACTIONS: Record<string, ButtonActionDef> = {
  insert: {
    label: "",
    icon: TextCursorInput,
    fields: [{ key: "markdown", label: "", multiline: true }],
    readonly: false,
    run(action, c) {
      const md = typeof action.markdown === "string" ? action.markdown : "";
      const node = c.editor.state.doc.nodeAt(c.pos);
      if (!md.trim() || !node) return;
      const doc = contextOf(c.editor).markdown.parse(md, c.editor.schema);
      c.editor.view.dispatch(c.editor.state.tr.insert(c.pos + node.nodeSize, doc.content).scrollIntoView());
    },
  },
  link: {
    label: "",
    icon: Link,
    fields: [{ key: "url", label: "" }],
    readonly: true,
    run(action, c) {
      if (typeof action.url === "string" && action.url.trim()) openHref(c.services, action.url, c.event);
    },
  },
};

/** base kinds and the host's, base first; a host kind of a base name does not replace it */
export function buttonActionDefs(services: { buttonActions?: Record<string, ButtonActionDef> }): Record<string, ButtonActionDef> {
  return { ...services.buttonActions, ...BASE_BUTTON_ACTIONS };
}

export const Button = Node.create({
  name: "button",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return {
      label: { default: "", parseHTML: (dom: HTMLElement) => dom.getAttribute("data-label") ?? "", renderHTML: (a: { label: string }) => ({ "data-label": a.label ?? "" }) },
      actions: {
        default: [],
        parseHTML: (dom: HTMLElement) => parseButtonActions(dom.getAttribute("data-actions") ?? ""),
        renderHTML: (a: { actions: ButtonAction[] }) => ({ "data-actions": JSON.stringify(a.actions ?? []) }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="button"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes({ "data-type": "button", class: "wy-button-block" }, HTMLAttributes), ["button", { type: "button", class: "wy-button" }, String(node.attrs.label ?? "")]];
  },
});

export const buttonExtension: EditorExtension = {
  name: "button",
  tiptap: [Button],
  nodeViews: { button: ButtonView },
  markdown: {
    fences: [{ kind: "button", parse: (ctx) => ctx.atom("button_block", { label: ctx.info.attrs.label ?? "", actions: parseButtonActions(ctx.body) }) }],
    tokens: { button_block: { node: "button", getAttrs: (tok) => ({ label: tok.meta.label, actions: tok.meta.actions }) } },
    nodes: {
      button(state, node, _parent, _index, h) {
        h.writeFence(state, node, formatInfo("button", { label: infoText(node.attrs.label) }), formatButtonActions(node.attrs.actions as ButtonAction[]));
      },
    },
  },
  slash: [
    {
      id: "button",
      group: "blocks",
      rank: 50,
      label: "",
      icon: MousePointerClick,
      keywords: "button action template automation",
      run: (c) => c.insert("button", { label: "", actions: [{ kind: "insert", markdown: "" }] }),
    },
  ],
};
