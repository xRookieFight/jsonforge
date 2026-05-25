import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class ButtonElement extends ElementType {
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
      .add({ key: "sound_name", label: "Click Sound", kind: "string", group: "Audio", default: "ui.click" });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(240,200,120,0.45)", label: "Button" };
  }
}
