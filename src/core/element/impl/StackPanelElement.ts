import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class StackPanelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "stack_panel",
      label: "Stack Panel",
      icon: "stack",
      category: "container",
      jsonUiType: "stack_panel",
      acceptsChildren: true,
      defaultName: "stack_panel"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({
        key: "orientation",
        label: "Orientation",
        kind: "enum",
        group: "Layout",
        default: "vertical",
        options: ["vertical", "horizontal"]
      });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(80,140,200,0.05)", border: "1px dashed rgba(120,170,220,0.3)", label: "Stack" };
  }
}
