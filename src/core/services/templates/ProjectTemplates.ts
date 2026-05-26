import { ElementNode } from "../../element/ElementNode";
import { PropertyValue } from "../../property/base/PropertyType";

export type TemplateId = "blank" | "server_form";

export interface TemplateBuildResult {
  root: ElementNode;
}

function make(typeId: string, name: string, props: Record<string, PropertyValue>): ElementNode {
  return new ElementNode(typeId, name, props);
}

export class ProjectTemplates {
  public static build(id: TemplateId): TemplateBuildResult {
    switch (id) {
      case "server_form":
        return ProjectTemplates.serverForm();
      case "blank":
      default:
        return ProjectTemplates.blank();
    }
  }

  private static blank(): TemplateBuildResult {
    const root = make("panel", "root", {
      size: [1600, 900],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center"
    });
    return { root };
  }

  private static serverForm(): TemplateBuildResult {
    const root = make("panel", "root", {
      size: [1600, 900],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center"
    });

    const formRoot = make("panel", "long_form", {
      size: [240, 220],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center"
    });

    const background = make("image", "form_background", {
      size: [240, 220],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center",
      texture: "textures/ui/dialog_background_hollow",
      nineslice_size: [4, 4, 4, 4]
    });

    const title = make("label", "form_title", {
      size: [220, 20],
      offset: [0, 8],
      anchor_from: "top_middle",
      anchor_to: "top_middle",
      text: "Form Title",
      color: "#ffffff",
      text_alignment: "center",
      font_size: "large",
      shadow: true
    });

    const body = make("stack_panel", "form_body", {
      size: [220, 140],
      offset: [0, 34],
      anchor_from: "top_middle",
      anchor_to: "top_middle",
      orientation: "vertical"
    });

    const bodyText = make("label", "body_text", {
      size: [220, 40],
      offset: [0, 0],
      anchor_from: "top_left",
      anchor_to: "top_left",
      text: "Form body text. Replace me.",
      color: "#dddddd",
      text_alignment: "left",
      font_size: "normal"
    });

    const button = make("button", "form_button", {
      size: [200, 24],
      offset: [0, -16],
      anchor_from: "bottom_middle",
      anchor_to: "bottom_middle",
      default_control: "button.default",
      hover_control: "button.hover",
      pressed_control: "button.pressed",
      sound_name: "ui.click"
    });

    const buttonBg = make("image", "button_background", {
      size: [200, 24],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center",
      texture: "textures/ui/button_borderless_light",
      nineslice_size: [2, 2, 2, 2]
    });

    const buttonLabel = make("label", "button_text", {
      size: [200, 24],
      offset: [0, 0],
      anchor_from: "center",
      anchor_to: "center",
      text: "Click Me",
      color: "#ffffff",
      text_alignment: "center",
      font_size: "normal",
      shadow: true
    });

    button.addChild(buttonBg);
    button.addChild(buttonLabel);
    body.addChild(bodyText);
    formRoot.addChild(background);
    formRoot.addChild(title);
    formRoot.addChild(body);
    formRoot.addChild(button);
    root.addChild(formRoot);

    return { root };
  }
}
