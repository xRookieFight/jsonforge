/**
 * Collection of the form buttons of a screen.
 *
 * The `collection_index` of every button is a positional contract with the
 * script: index N on the screen has to be the N-th `form.button(...)` call in
 * the addon. Serializer and script generator share this pre-order walk so the
 * two never drift apart.
 */
import { ElementNode } from "../element/ElementNode";

export type ButtonActionType = "message" | "command" | "screen" | "scoreboard" | "none";
export type ScoreboardOperation = "add" | "remove" | "set" | "reset";

/** What the generated script does when the button is clicked. */
export interface ButtonAction {
  type: ButtonActionType;
  /** Message text, command line or target screen name. */
  value?: string;
  objective?: string;
  operation?: ScoreboardOperation;
  amount?: number;
}

export interface FormButtonData {
  node: ElementNode;
  index: number;
  /** Text drawn on the button - the script feeds it through the collection. */
  text: string;
  /** Optional icon drawn inside the button. */
  icon?: string;
  action: ButtonAction;
}

export const FORM_BUTTON_COLLECTION = "form_buttons";

function buttonAction(node: ElementNode): ButtonAction {
  const props = node.properties;
  const type = (props["action_type"] as ButtonActionType) ?? "message";
  const value = typeof props["action_value"] === "string" ? (props["action_value"] as string) : "";
  const objective = typeof props["scoreboard_objective"] === "string" ? (props["scoreboard_objective"] as string) : "";

  return {
    type,
    value: value || undefined,
    objective: objective || undefined,
    operation: (props["scoreboard_operation"] as ScoreboardOperation) ?? "add",
    amount: typeof props["scoreboard_amount"] === "number" ? (props["scoreboard_amount"] as number) : 1
  };
}

function buttonText(node: ElementNode): string {
  const text = node.properties["text"];
  if (typeof text === "string" && text.length > 0) return text;
  const label = node.children.find(child => typeof child.properties["text"] === "string");
  if (label) return label.properties["text"] as string;
  return node.name;
}

/** Walks the tree in pre-order and numbers the buttons as they appear. */
export function collectFormButtons(root: ElementNode): FormButtonData[] {
  const out: FormButtonData[] = [];
  const walk = (node: ElementNode): void => {
    if (node.typeId === "button") {
      const icon = node.properties["icon_texture"];
      out.push({
        node,
        index: out.length,
        text: buttonText(node),
        icon: typeof icon === "string" && icon.length > 0 ? icon : undefined,
        action: buttonAction(node)
      });
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}

/** Element id -> index in the collection, for the serializer to look up. */
export function buildButtonIndexMap(root: ElementNode): Map<string, number> {
  const map = new Map<string, number>();
  for (const button of collectFormButtons(root)) map.set(button.node.id, button.index);
  return map;
}
