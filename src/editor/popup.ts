import type { Editor } from "@tiptap/core";
import { VueRenderer } from "@tiptap/vue-3";
import type { Component } from "vue";
import type { Placement } from "@floating-ui/dom";
import { floatNear } from "../components/floating";

export interface Popup {
  readonly element: HTMLElement;
  /** the component instance (its exposed members) */
  readonly ref: unknown;
  update(props: Record<string, unknown>): void;
  reposition(): void;
  close(): void;
}

/** a component floating at a caret rectangle, mounted in <body> like the slash menu */
export function openPopup(editor: Editor, component: Component, props: Record<string, unknown>, rect: () => DOMRect | null, placement: Placement = "bottom-start"): Popup {
  const renderer = new VueRenderer(component, { props, editor });
  const el = renderer.element as HTMLElement;
  el.style.position = "fixed";
  el.style.zIndex = "1000";
  el.setAttribute("data-block-portal", "");
  el.classList.add("wy-menu");
  document.body.appendChild(el);
  const reference = { getBoundingClientRect: () => rect() ?? new DOMRect() };
  const floating = floatNear(reference, el, {
    placement,
    offset: 6,
    padding: 8,
    apply: (x, y) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    },
    room: (h) => el.style.setProperty("--wy-menu-room", `${Math.max(160, h)}px`),
  });
  let open = true;
  return {
    element: el,
    get ref() {
      return renderer.ref;
    },
    update(next) {
      if (!open) return;
      renderer.updateProps(next);
      floating.update();
    },
    reposition: () => floating.update(),
    close() {
      if (!open) return;
      open = false;
      floating.stop();
      renderer.destroy();
      el.remove();
    },
  };
}

/** the caret rectangle of a document position */
export function caretRect(editor: Editor, pos: number): () => DOMRect | null {
  return () => {
    if (editor.isDestroyed) return null;
    const at = Math.min(pos, editor.state.doc.content.size);
    try {
      const c = editor.view.coordsAtPos(at);
      return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
    } catch {
      return null;
    }
  };
}
