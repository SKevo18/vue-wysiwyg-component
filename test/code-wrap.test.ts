import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createDocument, getHTMLFromFragment } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { createMarkdown } from "../src/markdown";
import { resolveConfig, schemaFor } from "../src/schema";
import { codeWraps, setCodeWrap, WysiwygEditor, type EditorHandle } from "../src/index";

const md = createMarkdown([], { base: { diagrams: true } });
const roundTrip = (src: string) => md.serialize(md.parse(src));

describe("code wrap flag in the fence info", () => {
  it("round trips a code block with and without nowrap", () => {
    const wrapped = "```js\nconst a = 1;\n```\n";
    expect(roundTrip(wrapped)).toBe(wrapped);
    expect(codeWraps(md.parse(wrapped).child(0).attrs.meta as string)).toBe(true);
    const nowrap = "```js nowrap\nconst a = 1;\n```\n";
    expect(roundTrip(nowrap)).toBe(nowrap);
    const node = md.parse(nowrap).child(0);
    expect(node.attrs).toMatchObject({ language: "js", meta: "nowrap" });
    expect(codeWraps(node.attrs.meta as string)).toBe(false);
  });

  it("keeps other info words around nowrap", () => {
    const src = '```js nowrap title="app.js"\nconst a = 1;\n```\n';
    expect(roundTrip(src)).toBe(src);
    expect(codeWraps('title="app.js" nowrap')).toBe(false);
    expect(codeWraps("nowrapped")).toBe(true);
  });

  it("keeps nowrap on a block without a language as a text block", () => {
    const schema = md.parse("").type.schema;
    const node = schema.nodes.codeBlock!.create({ language: null, meta: "nowrap" }, schema.text("plain"));
    const out = md.serialize(schema.topNodeType.create(null, node));
    expect(out).toBe("```text nowrap\nplain\n```\n");
    expect(codeWraps(md.parse(out).child(0).attrs.meta as string)).toBe(false);
  });

  it("writes nowrap first and drops it again without touching other words", () => {
    expect(setCodeWrap('title="app.js"', false)).toBe('nowrap title="app.js"');
    expect(setCodeWrap('title="app.js" nowrap', false)).toBe('nowrap title="app.js"');
    expect(setCodeWrap('nowrap title="app.js"', true)).toBe('title="app.js"');
    expect(setCodeWrap("nowrap", true)).toBe("");
    expect(setCodeWrap("", true)).toBe("");
  });
});

describe("code wrap flag in html", () => {
  const schema = schemaFor(resolveConfig("html", undefined));
  const toHtml = (html: string) => getHTMLFromFragment(createDocument(html, schema).content, schema);

  it("renders data-nowrap for nowrap blocks and parses it back", () => {
    const out = toHtml('<pre data-nowrap><code class="language-js">const a = 1;</code></pre>');
    expect(out).toContain("data-nowrap");
    expect(toHtml(out)).toBe(out);
    const node = createDocument(out, schema).firstChild!;
    expect(codeWraps(node.attrs.meta as string)).toBe(false);
    const plain = toHtml('<pre><code class="language-js">const a = 1;</code></pre>');
    expect(plain).not.toContain("nowrap");
    expect(codeWraps(createDocument(plain, schema).firstChild!.attrs.meta as string)).toBe(true);
  });
});

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

async function editor(modelValue: string, updates: string[] = []) {
  const ready = Promise.withResolvers<EditorHandle>();
  wrapper = mount(WysiwygEditor, {
    props: { modelValue, base: { diagrams: true }, "onUpdate:modelValue": (v: string) => updates.push(v), onReady: (x: EditorHandle) => ready.resolve(x) },
    attachTo: document.body,
  });
  return ready.promise;
}

describe("code wrap toggle", () => {
  it("toggles nowrap on the code block at the caret", async () => {
    const handle = await editor("```js\nconst a = 1;\n```\n");
    const e = handle.editor!;
    e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, 3)));
    expect(e.commands.toggleCodeWrap()).toBe(true);
    expect(handle.getContent()).toBe("```js nowrap\nconst a = 1;\n```\n");
    await vi.waitFor(() => expect(document.querySelector(".wy-node-code pre")!.hasAttribute("data-nowrap")).toBe(true));
    e.commands.toggleCodeWrap();
    expect(handle.getContent()).toBe("```js\nconst a = 1;\n```\n");
  });

  it("does nothing outside a code block", async () => {
    const handle = await editor("Plain text\n");
    expect(handle.editor!.commands.toggleCodeWrap()).toBe(false);
  });

  it("offers a wrap lines checkbox in the block menu", async () => {
    const handle = await editor("```js\nconst a = 1;\n```\n");
    document.querySelector<HTMLButtonElement>(".wy-node-code [data-block-more]")!.click();
    const box = await vi.waitFor(() => {
      const el = document.querySelector<HTMLInputElement>('.wy-code-wrap input[type="checkbox"]');
      expect(el).not.toBeNull();
      return el!;
    });
    expect(box.checked).toBe(true);
    box.click();
    expect(handle.getContent()).toBe("```js nowrap\nconst a = 1;\n```\n");
  });
});
