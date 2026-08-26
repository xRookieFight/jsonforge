import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class ButtonElement extends ElementType {
  /** Properties consumed by the addon exporter instead of plain JSON UI. */
  public static readonly FORM_KEYS = [
    "text",
    "default_texture",
    "hover_texture",
    "pressed_texture",
    "icon_texture",
    "font_type",
    "font_scale_factor",
    "shadow",
    "text_alignment",
    "action_type",
    "action_value",
    "scoreboard_objective",
    "scoreboard_operation",
    "scoreboard_amount"
  ];

  public metadata(): ElementMetadata {
    return {
      id: "button",
      label: "Button",
      icon: "button",
      category: "control",
      jsonUiType: "button",
      acceptsChildren: true,
      defaultName: "button"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "default_control", label: "Default Control", kind: "string", group: "Button", default: "default" })
      .add({ key: "hover_control", label: "Hover Control", kind: "string", group: "Button", default: "hover" })
      .add({ key: "pressed_control", label: "Pressed Control", kind: "string", group: "Button", default: "pressed" })
      .add({ key: "button_mappings", label: "Button Mappings", kind: "stringArray", group: "Input", default: [] })
      .add({ key: "sound_name", label: "Click Sound", kind: "string", group: "Audio", default: "ui.click" })
      .add({ key: "text", label: "Text", kind: "string", group: "Form Button", default: "Button" })
      .add({ key: "default_texture", label: "Default Texture", kind: "texture", group: "Form Button", default: "" })
      .add({ key: "hover_texture", label: "Hover Texture", kind: "texture", group: "Form Button", default: "" })
      .add({ key: "pressed_texture", label: "Pressed Texture", kind: "texture", group: "Form Button", default: "" })
      .add({ key: "icon_texture", label: "Icon Texture", kind: "texture", group: "Form Button", default: "" })
      .add({ key: "font_type", label: "Font Type", kind: "enum", group: "Form Button", default: "default", options: ["default", "smooth", "rune", "MinecraftSeven", "MinecraftTen", "unicode"] })
      .add({ key: "font_scale_factor", label: "Font Scale", kind: "number", group: "Form Button", default: 1, min: 0.1, max: 4, step: 0.05 })
      .add({ key: "shadow", label: "Shadow", kind: "boolean", group: "Form Button", default: false })
      .add({ key: "text_alignment", label: "Alignment", kind: "enum", group: "Form Button", default: "center", options: ["left", "center", "right"] })
      .add({
        key: "action_type",
        label: "On Click",
        kind: "enum",
        group: "Action",
        default: "message",
        options: ["message", "command", "screen", "scoreboard", "none"]
      })
      .add({ key: "action_value", label: "Message / Command / Screen", kind: "string", group: "Action", default: "" })
      .add({ key: "scoreboard_objective", label: "Objective", kind: "string", group: "Scoreboard", default: "" })
      .add({
        key: "scoreboard_operation",
        label: "Operation",
        kind: "enum",
        group: "Scoreboard",
        default: "add",
        options: ["add", "remove", "set", "reset"]
      })
      .add({ key: "scoreboard_amount", label: "Amount", kind: "number", group: "Scoreboard", default: 1, step: 1 });
  }

  /**
   * Form button data drives the addon export only - a plain JSON UI button has
   * no place for it, so it never reaches the .json file.
   */
  public toJsonUi(properties: Record<string, unknown>): Record<string, unknown> {
    const out = super.toJsonUi(properties);
    for (const key of ButtonElement.FORM_KEYS) delete out[key];
    return out;
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(240,200,120,0.45)", label: "Button" };
  }
}
