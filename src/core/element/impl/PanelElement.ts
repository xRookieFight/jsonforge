import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class PanelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "panel",
      label: "Panel",
      icon: "panel",
      category: "container",
      jsonUiType: "panel",
      acceptsChildren: true,
      defaultName: "panel"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base();
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(120,130,160,0.06)", border: "1px dashed rgba(180,180,200,0.25)", label: "Panel" };
  }
}
