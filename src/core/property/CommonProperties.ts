import { PropertySchema } from "./PropertySchema";

export class CommonProperties {
  public static base(): PropertySchema {
    return new PropertySchema()
      .add({ key: "size", label: "Size", kind: "vec2", group: "Transform", default: [120, 40] })
      .add({ key: "offset", label: "Offset", kind: "vec2", group: "Transform", default: [0, 0] })
      .add({
        key: "anchor_from",
        label: "Anchor From",
        kind: "anchor",
        group: "Transform",
        default: "center"
      })
      .add({
        key: "anchor_to",
        label: "Anchor To",
        kind: "anchor",
        group: "Transform",
        default: "center"
      })
      .add({ key: "alpha", label: "Alpha", kind: "number", group: "Appearance", default: 1, min: 0, max: 1, step: 0.05 })
      .add({ key: "visible", label: "Visible", kind: "boolean", group: "Appearance", default: true })
      .add({ key: "enabled", label: "Enabled", kind: "boolean", group: "Appearance", default: true })
      .add({ key: "clips_children", label: "Clip Children", kind: "boolean", group: "Layout", default: false })
      .add({ key: "propagate_alpha", label: "Propagate Alpha", kind: "boolean", group: "Appearance", default: true })
      .add({ key: "layer", label: "Layer", kind: "number", group: "Layout", default: 0, step: 1 });
  }
}
