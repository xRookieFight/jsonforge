import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class InputPanelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "input_panel",
      label: "Input Panel",
      icon: "input",
      category: "input",
      jsonUiType: "input_panel",
      acceptsChildren: true,
      defaultName: "input_panel"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "modal", label: "Modal", kind: "boolean", group: "Input", default: false })
      .add({ key: "always_listen", label: "Always Listen", kind: "boolean", group: "Input", default: false })
      .add({ key: "button_mappings", label: "Button Mappings", kind: "stringArray", group: "Input", default: [] });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(60,180,180,0.05)", border: "1px dashed rgba(100,220,220,0.3)", label: "Input" };
  }
}
