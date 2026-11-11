import { Node } from "@tiptap/core";
import type { ButtonAction, ButtonActionDef, EditorExtension } from "../types";
/** the actions of a fence body or `data-actions`; anything that is not a JSON array of `{ kind }` objects is none */
export declare function parseButtonActions(json: string): ButtonAction[];
/** the fence body: the actions as JSON indented by two spaces, nothing without actions */
export declare function formatButtonActions(actions: readonly ButtonAction[]): string;
export declare const BASE_BUTTON_ACTIONS: Record<string, ButtonActionDef>;
/** base kinds and the host's, base first; a host kind of a base name does not replace it */
export declare function buttonActionDefs(services: {
    buttonActions?: Record<string, ButtonActionDef>;
}): Record<string, ButtonActionDef>;
export declare const Button: Node<any, any>;
export declare const buttonExtension: EditorExtension;
