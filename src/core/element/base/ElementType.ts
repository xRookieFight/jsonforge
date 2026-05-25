import { Module } from "../../base/Module";
import { PropertySchema } from "../../property/PropertySchema";
import { CommonProperties } from "../../property/CommonProperties";

export interface ElementMetadata {
  id: string;
  label: string;
  icon: string;
  category: "container" | "control" | "input" | "display";
  jsonUiType: string;
  acceptsChildren: boolean;
  defaultName: string;
}

export abstract class ElementType implements Module {
  public abstract metadata(): ElementMetadata;

  public getName(): string {
    return this.metadata().id;
  }

  public schema(): PropertySchema {
    return CommonProperties.base();
  }

  public renderHint(): { background?: string; border?: string; label?: string } {
    return {};
  }

  public toJsonUi(properties: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { type: this.metadata().jsonUiType };
    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) continue;
      out[key] = value;
    }
    return out;
  }
}
