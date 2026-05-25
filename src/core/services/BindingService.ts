import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";

export interface BindingDescriptor {
  id: string;
  binding_name: string;
  binding_type?: "global" | "view" | "collection" | "collection_details" | "none";
  source_property_name?: string;
  target_property_name?: string;
  source_control_name?: string;
  binding_collection_name?: string;
}

export class BindingService extends Service {
  public static readonly NAME = "BindingService";
  public readonly bus = new EventBus();

  private readonly bindings = new Map<string, BindingDescriptor[]>();

  public getName(): string {
    return BindingService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.BINDING;
  }

  public set(elementId: string, bindings: BindingDescriptor[]): void {
    if (bindings.length === 0) this.bindings.delete(elementId);
    else this.bindings.set(elementId, bindings);
    this.bus.emit("binding:changed", { elementId, bindings });
  }

  public get(elementId: string): BindingDescriptor[] {
    return this.bindings.get(elementId) ?? [];
  }

  public clear(elementId: string): void {
    this.bindings.delete(elementId);
    this.bus.emit("binding:changed", { elementId, bindings: [] });
  }

  public all(): Map<string, BindingDescriptor[]> {
    return new Map(this.bindings);
  }
}
