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
    return CommonProperties.base()
      .add({ key: "texture", label: "Texture", kind: "texture", group: "Image", default: "" })
      .add({ key: "nineslice_size", label: "Nine-Slice Size", kind: "vec4", group: "Nine-Slice", default: [0, 0, 0, 0] });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(120,130,160,0.06)", border: "1px dashed rgba(180,180,200,0.25)", label: "Panel" };
  }

  /**
   * A panel cannot draw a texture in JSON UI, but an `image` also accepts
   * `controls` - so a textured panel is exported as an image and keeps working
   * as a container.
   */
  public toJsonUi(properties: Record<string, unknown>): Record<string, unknown> {
    const out = super.toJsonUi(properties);
    const texture = properties["texture"];
    if (typeof texture === "string" && texture.length > 0) out["type"] = "image";
    else delete out["texture"];

    const nineSlice = properties["nineslice_size"];
    if (out["type"] === "image" && Array.isArray(nineSlice) && nineSlice.some(v => v !== 0)) {
      out["nineslice_size"] = nineSlice;
    } else {
      delete out["nineslice_size"];
    }
    return out;
  }
}
