import { nextTick, type Ref } from "vue";
import type { MathEdit } from "../types";

export function applyMathEdit(area: Ref<HTMLTextAreaElement | null>, tex: string, write: (value: string) => void, edit: MathEdit) {
  const el = area.value;
  const start = el?.selectionStart ?? tex.length;
  const end = el?.selectionEnd ?? tex.length;
  const next = edit(tex, start, end);
  write(next.value);
  void nextTick(() => {
    area.value?.focus();
    area.value?.setSelectionRange(next.start, next.end);
  });
}
