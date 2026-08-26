import { Service, ServicePriority } from "../base/Service";
import { ElementNode } from "../element/ElementNode";
import { EventBus } from "../event/EventBus";

export interface Preset {
  id: string;
  label: string;
  description?: string;
  factory: () => ElementNode;
}

export class PresetService extends Service {
  public static readonly NAME = "PresetService";
  public readonly bus = new EventBus();

  private readonly presets = new Map<string, Preset>();

  public getName(): string {
    return PresetService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.PRESET;
  }

  public async onEnable(): Promise<void> {
    await super.onEnable();
    this.registerDefaults();
  }

  public register(preset: Preset): void {
    this.presets.set(preset.id, preset);
    this.bus.emit("preset:added", preset);
  }

  public list(): Preset[] {
    return [...this.presets.values()];
  }

  public get(id: string): Preset | undefined {
    return this.presets.get(id);
  }

  private registerDefaults(): void {
    this.register({
      id: "preset:dialog",
      label: "Dialog Panel",
      description: "Centered dialog with nine-slice background.",
      factory: () => {
        const dialog = new ElementNode("panel", "dialog_panel", {
          size: [180, 110],
          anchor_from: "center",
          anchor_to: "center"
        });
        const bg = new ElementNode("image", "dialog_bg", {
          size: [180, 110],
          texture: "textures/ui/dialog_background_opaque",
          nineslice_size: [8, 8, 8, 8]
        });
        const title = new ElementNode("label", "dialog_title", {
          text: "Title",
          size: [160, 14],
          offset: [0, 8],
          anchor_from: "top_middle",
          anchor_to: "top_middle",
          color: "#ffffff"
        });
        dialog.addChild(bg);
        dialog.addChild(title);
        return dialog;
      }
    });

    this.register({
      id: "preset:button",
      label: "Standard Button",
      description: "Button with default/hover/pressed controls.",
      factory: () => {
        const button = new ElementNode("button", "standard_button", {
          size: [80, 20],
          anchor_from: "center",
          anchor_to: "center"
        });
        const label = new ElementNode("label", "button_label", {
          text: "Click",
          size: [80, 20],
          color: "#ffffff",
          text_alignment: "center"
        });
        button.addChild(label);
        return button;
      }
    });

    this.register({
      id: "preset:form-list",
      label: "Form Buttons List",
      description: "Scrolling stack of collection buttons.",
      factory: () => {
        const scroll = new ElementNode("scrolling_panel", "form_scroll", {
          size: [160, 150],
          anchor_from: "center",
          anchor_to: "center"
        });
        const stack = new ElementNode("stack_panel", "form_stack", {
          size: [160, 150],
          orientation: "vertical"
        });
        const collection = new ElementNode("collection_panel", "form_buttons", {
          size: [160, 20],
          collection_name: "form_buttons"
        });
        stack.addChild(collection);
        scroll.addChild(stack);
        return scroll;
      }
    });
  }
}
