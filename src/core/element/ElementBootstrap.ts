import { ElementRegistry } from "./ElementRegistry";
import { PanelElement } from "./impl/PanelElement";
import { StackPanelElement } from "./impl/StackPanelElement";
import { CollectionPanelElement } from "./impl/CollectionPanelElement";
import { ScrollingPanelElement } from "./impl/ScrollingPanelElement";
import { ImageElement } from "./impl/ImageElement";
import { LabelElement } from "./impl/LabelElement";
import { ButtonElement } from "./impl/ButtonElement";
import { InputPanelElement } from "./impl/InputPanelElement";
import { ToggleElement } from "./impl/ToggleElement";
import { CustomElement } from "./impl/CustomElement";

export class ElementBootstrap {
  public static registerDefaults(): void {
    const registry = ElementRegistry.get();
    if (registry.list().length > 0) return;
    registry.register(new PanelElement());
    registry.register(new StackPanelElement());
    registry.register(new CollectionPanelElement());
    registry.register(new ScrollingPanelElement());
    registry.register(new ImageElement());
    registry.register(new LabelElement());
    registry.register(new ButtonElement());
    registry.register(new InputPanelElement());
    registry.register(new ToggleElement());
    registry.register(new CustomElement());
  }
}
