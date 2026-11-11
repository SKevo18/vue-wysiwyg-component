// A collaborator's caret for CollaborationCaret's `render` option: a line in their color, labelled with their
// avatar and name. The extension's own render shows the name only.
import type { CaretUser } from "../types";

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
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = user.avatar;
    label.append(img);
  }
  label.append(document.createTextNode(user.name));
  caret.append(label);
  return caret;
}
