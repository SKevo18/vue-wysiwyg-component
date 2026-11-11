// A collaborator's caret for CollaborationCaret's `render` option: a line in their color, labelled with their
// avatar and name. The extension's own render shows the name only.
import type { CaretUser } from "../types";

/** up to two letters: first and last word of the name */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? "")][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]!][0] ?? "") : "";
  return (first + last).toUpperCase();
}

function badge(name: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "collaboration-carets__initials";
  el.setAttribute("aria-hidden", "true");
  el.textContent = initials(name);
  return el;
}

export function collaborationCaret(user: CaretUser): HTMLElement {
  const caret = document.createElement("span");
  caret.className = "collaboration-carets__caret";
  // the CSSOM ignores values that are not colors, so a collaborator cannot inject other styles
  caret.style.borderColor = user.color;
  const label = document.createElement("div");
  label.className = "collaboration-carets__label";
  label.style.backgroundColor = user.color;
  if (user.avatar) {
    const img = document.createElement("img");
    img.className = "collaboration-carets__avatar";
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.replaceWith(badge(user.name)), { once: true });
    img.src = user.avatar;
    label.append(img);
  }
  label.append(document.createTextNode(user.name));
  caret.append(label);
  return caret;
}
