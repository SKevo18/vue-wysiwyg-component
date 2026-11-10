import { type Ref } from "vue";
import type { MathEdit } from "../types";
export declare function applyMathEdit(area: Ref<HTMLTextAreaElement | null>, tex: string, write: (value: string) => void, edit: MathEdit): void;
