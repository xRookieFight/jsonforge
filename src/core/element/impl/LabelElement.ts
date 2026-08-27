import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class LabelElement extends ElementType {
  /** Scoreboard bindings, consumed by the addon exporter only. */
  public static readonly SCOREBOARD_KEYS = ["sb_source", "sb_index"];

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
      .add({ key: "localize", label: "Localize", kind: "boolean", group: "Text", default: false })
      .add({
        key: "sb_source",
        label: "Live Value",
        kind: "enum",
        group: "Scoreboard",
        default: "none",
        options: ["none", "form_title", "objective_title", "player_name", "player_score"]
      })
      .add({ key: "sb_index", label: "Row Index", kind: "number", group: "Scoreboard", default: 0, min: 0, step: 1 });

  }

  /** The live-value keys drive the export; a plain label has no room for them. */
  public toJsonUi(properties: Record<string, unknown>): Record<string, unknown> {
    const out = super.toJsonUi(properties);
    for (const key of LabelElement.SCOREBOARD_KEYS) delete out[key];
    return out;
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "transparent", border: "1px dashed rgba(220,220,220,0.2)" };
  }
}
