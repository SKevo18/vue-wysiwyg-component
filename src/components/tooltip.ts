import type { Directive } from "vue";
import { floatNear } from "./floating";

export type TooltipValue = string | { text: string; keys?: string } | null | undefined;

const DELAY = 450;
const apple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function formatKeys(keys: string): string {
  const parts = keys.split("-").map((k) => {
    const low = k.toLowerCase();
    if (low === "mod") return apple ? "⌘" : "Ctrl";
    if (low === "shift") return apple ? "⇧" : "Shift";
    if (low === "alt") return apple ? "⌥" : "Alt";
    if (low === "enter") return apple ? "↩" : "Enter";
    return k.length === 1 ? k.toUpperCase() : k;
  });
  return apple ? parts.join("") : parts.join("+");
}

let tip: HTMLElement | null = null;
let current: HTMLElement | null = null;
let timer = 0;
let stop: (() => void) | null = null;
const values = new WeakMap<HTMLElement, TooltipValue>();

function element(): HTMLElement {
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "wy-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
}

function hide() {
  window.clearTimeout(timer);
  stop?.();
  stop = null;
  current = null;
  if (tip) tip.hidden = true;
}

function show(el: HTMLElement) {
  const value = values.get(el);
  const text = typeof value === "string" ? value : value?.text;
  if (!text || !el.isConnected) return;
  const t = element();
  t.textContent = text;
  const keys = typeof value === "object" && value?.keys ? formatKeys(value.keys) : "";
  if (keys) {
    const k = document.createElement("kbd");
    k.textContent = keys;
    t.append(" ", k);
  }
  t.hidden = false;
  current = el;
  stop?.();
  stop = floatNear(el, t, {
    placement: "top",
    offset: 6,
    padding: 6,
    apply: (x, y) => {
      t.style.left = `${x}px`;
      t.style.top = `${y}px`;
    },
  }).stop;
}

function onEnter(e: Event) {
  const el = e.currentTarget as HTMLElement;
  if (e instanceof PointerEvent && e.pointerType === "touch") return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => show(el), current ? 0 : DELAY);
}

function onFocus(e: FocusEvent) {
  const el = e.currentTarget as HTMLElement;
  if (el.matches(":focus-visible")) show(el);
}

export const vTooltip: Directive<HTMLElement, TooltipValue> = {
  mounted(el, binding) {
    values.set(el, binding.value);
    const text = typeof binding.value === "string" ? binding.value : binding.value?.text;
    if (text && !el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", text);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", hide);
    el.addEventListener("pointerdown", hide);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", hide);
  },
  updated(el, binding) {
    values.set(el, binding.value);
    if (current === el && JSON.stringify(binding.value) !== JSON.stringify(binding.oldValue)) {
      hide();
      show(el);
    }
  },
  beforeUnmount(el) {
    if (current === el) hide();
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", hide);
    el.removeEventListener("pointerdown", hide);
    el.removeEventListener("focus", onFocus);
    el.removeEventListener("blur", hide);
  },
};
