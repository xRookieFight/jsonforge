import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class LabelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "label",
      label: "Label",
      icon: "text",
      category: "display",
      jsonUiType: "label",
      acceptsChildren: false,
      defaultName: "label"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({ key: "text", label: "Text", kind: "string", group: "Text", default: "Label" })
      .add({ key: "color", label: "Color", kind: "color", group: "Text", default: "#ffffff" })
      .add({ key: "font_size", label: "Font Size", kind: "enum", group: "Text", default: "normal", options: ["normal", "small", "large", "extra_large"] })
      .add({ key: "font_type", label: "Font Type", kind: "enum", group: "Text", default: "default", options: ["default", "rune", "unicode", "smooth", "MinecraftTen"] })
      .add({ key: "font_scale_factor", label: "Scale Factor", kind: "number", group: "Text", default: 1, min: 0.1, max: 4, step: 0.05 })
      .add({ key: "shadow", label: "Shadow", kind: "boolean", group: "Text", default: false })
      .add({ key: "text_alignment", label: "Alignment", kind: "enum", group: "Text", default: "left", options: ["left", "center", "right"] })
      .add({ key: "localize", label: "Localize", kind: "boolean", group: "Text", default: false });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "transparent", border: "1px dashed rgba(220,220,220,0.2)" };
  }
}
