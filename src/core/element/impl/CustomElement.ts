import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class CustomElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "custom",
      label: "Custom",
      icon: "custom",
      category: "container",
      jsonUiType: "custom",
      acceptsChildren: true,
      defaultName: "custom"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "renderer", label: "Renderer", kind: "string", group: "Custom", default: "" });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(180,180,180,0.05)", border: "1px dotted rgba(200,200,200,0.3)", label: "Custom" };
  }
}
