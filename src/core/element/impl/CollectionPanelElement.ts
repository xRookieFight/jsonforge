import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class CollectionPanelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "collection_panel",
      label: "Collection Panel",
      icon: "collection",
      category: "container",
      jsonUiType: "collection_panel",
      acceptsChildren: true,
      defaultName: "collection_panel"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "collection_name", label: "Collection Name", kind: "string", group: "Collection", default: "form_buttons" })
      .add({ key: "collection_index", label: "Index", kind: "number", group: "Collection", default: 0, step: 1 });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(170,140,60,0.06)", border: "1px dashed rgba(220,180,80,0.35)", label: "Collection" };
  }
}
