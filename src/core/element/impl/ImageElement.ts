import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class ImageElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "image",
      label: "Image",
      icon: "image",
      category: "display",
      jsonUiType: "image",
      acceptsChildren: false,
      defaultName: "image"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "texture", label: "Texture", kind: "texture", group: "Image", default: "" })
      .add({
        key: "tiled",
        label: "Tile",
        kind: "enum",
        group: "Image",
        default: "none",
        options: ["none", "x", "y", "both"]
      })
      .add({ key: "uv", label: "UV Origin", kind: "vec2", group: "Image", default: [0, 0] })
      .add({ key: "uv_size", label: "UV Size", kind: "vec2", group: "Image", default: [0, 0] })
      .add({ key: "color", label: "Tint", kind: "color", group: "Image", default: "#ffffff" })
      .add({ key: "grayscale", label: "Grayscale", kind: "boolean", group: "Image", default: false })
      .add({ key: "nineslice_size", label: "Nine-Slice Size", kind: "vec4", group: "Nine-Slice", default: [0, 0, 0, 0] });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(100,180,140,0.08)", border: "1px solid rgba(140,220,180,0.35)", label: "Image" };
  }

  public toJsonUi(properties: Record<string, unknown>): Record<string, unknown> {
    const out = super.toJsonUi(properties);
    const nineSlice = properties["nineslice_size"];
    if (Array.isArray(nineSlice) && nineSlice.some(v => v !== 0)) {
      out["nineslice_size"] = nineSlice;
    } else {
      delete out["nineslice_size"];
    }
    return out;
  }
}
