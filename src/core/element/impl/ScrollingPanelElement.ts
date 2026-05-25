import { ElementMetadata, ElementType } from "../base/ElementType";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export class ScrollingPanelElement extends ElementType {
  public metadata(): ElementMetadata {
    return {
      id: "scrolling_panel",
      label: "Scrolling Panel",
      icon: "scroll",
      category: "container",
      jsonUiType: "scrolling_panel",
      acceptsChildren: true,
      defaultName: "scrolling_panel"
    };
  }

  public schema(): PropertySchema {
    return CommonProperties.base()
      .add({
        key: "scroll_direction",
        label: "Scroll Direction",
        kind: "enum",
        group: "Scroll",
        default: "vertical",
        options: ["vertical", "horizontal", "both"]
      })
      .add({ key: "scrollbar_track_button", label: "Scrollbar Track", kind: "string", group: "Scroll", default: "common.scrollbar_track" })
      .add({ key: "scrollbar_box", label: "Scrollbar Box", kind: "string", group: "Scroll", default: "common.scrollbar_box" });
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return { background: "rgba(140,90,200,0.06)", border: "1px dashed rgba(180,130,230,0.35)", label: "Scrolling" };
  }
}
