import { ElementNode } from "../element/ElementNode";
import { ElementRegistry } from "../element/ElementRegistry";
import { PropertyValue } from "../property/base/PropertyType";

export interface ImportResult {
  namespace: string;
  root: ElementNode;
}

export class JsonUiImporter {
  public import(text: string): ImportResult {
    const data = JSON.parse(text) as Record<string, unknown>;
    const namespace = (data["namespace"] as string) ?? "default_namespace";
    const entries = Object.entries(data).filter(([key]) => key !== "namespace");

    const rootKey = this.findRoot(entries);
    const rootRaw = (entries.find(([key]) => key === rootKey)?.[1] as Record<string, unknown>) ?? {};
    const root = this.buildNode(rootKey, rootRaw, entries);
    return { namespace, root };
  }

  private findRoot(entries: Array<[string, unknown]>): string {
    const referenced = new Set<string>();
    for (const [, raw] of entries) {
      if (raw && typeof raw === "object" && "controls" in raw) {
        const controls = (raw as { controls?: Array<Record<string, unknown>> }).controls ?? [];
        for (const control of controls) {
          for (const key of Object.keys(control)) referenced.add(key);
        }
      }
    }
    const roots = entries.filter(([key]) => !referenced.has(key));
    return roots[0]?.[0] ?? entries[0]?.[0] ?? "root";
  }

  private buildNode(name: string, raw: Record<string, unknown>, all: Array<[string, unknown]>): ElementNode {
    const typeId = (raw["type"] as string) ?? "panel";
    const knownType = ElementRegistry.get().get(typeId)?.metadata().id ?? "panel";

    const node = new ElementNode(knownType, name, this.stripStructural(raw) as Record<string, PropertyValue>);
    const controls = (raw["controls"] as Array<Record<string, unknown>>) ?? [];
    for (const control of controls) {
      for (const [childName] of Object.entries(control)) {
        const childRaw = (all.find(([key]) => key === childName)?.[1] as Record<string, unknown>) ?? control[childName] as Record<string, unknown> ?? {};
        node.addChild(this.buildNode(childName, childRaw, all));
      }
    }
    return node;
  }

  private stripStructural(raw: Record<string, unknown>): Record<string, unknown> {
    const exclude = new Set(["type", "controls", "bindings"]);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (exclude.has(key)) continue;
      out[key] = value;
    }
    return out;
  }
}
