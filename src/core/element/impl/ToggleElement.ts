import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class ToggleElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "toggle",
      label: "Toggle",
      icon: "toggle",
      category: "control",
      jsonUiType: "toggle",
      acceptsChildren: true,
      defaultName: "toggle"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "checked_control", label: "Checked Control", kind: "string", group: "Toggle", default: "checked" })
      .add({ key: "unchecked_control", label: "Unchecked Control", kind: "string", group: "Toggle", default: "unchecked" })
      .add({ key: "checked_hover_control", label: "Checked Hover", kind: "string", group: "Toggle", default: "checked_hover" })
      .add({ key: "unchecked_hover_control", label: "Unchecked Hover", kind: "string", group: "Toggle", default: "unchecked_hover" })
      .add({ key: "toggle_name", label: "Toggle Name", kind: "string", group: "Toggle", default: "" })
      .add({ key: "toggle_default_state", label: "Default State", kind: "boolean", group: "Toggle", default: false })
      .add({ key: "toggle_group_forced_index", label: "Group Forced Index", kind: "number", group: "Toggle", default: -1, step: 1 })
      .add({ key: "radio_toggle_group", label: "Radio Group", kind: "boolean", group: "Toggle", default: false });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(220,90,140,0.06)", border: "1px solid rgba(240,140,180,0.4)", label: "Toggle" };
  }
}
