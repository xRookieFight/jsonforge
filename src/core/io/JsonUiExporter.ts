import { ElementNode } from "../element/ElementNode";
import { ElementRegistry } from "../element/ElementRegistry";
import { Container } from "../di/Container";
import { BindingService } from "../services/BindingService";

export interface ExportResult {
  json: Record<string, unknown>;
  text: string;
}

export class JsonUiExporter {
  public export(namespace: string, root: ElementNode): ExportResult {
    const out: Record<string, unknown> = { namespace };
    out[root.name] = this.exportNode(root, true);
    for (const child of this.collectControls(root)) {
      out[child.name] = this.exportNode(child, false);
    }
    const text = JSON.stringify(out, null, 2);
    return { json: out, text };
  }

  private exportNode(node: ElementNode, isRoot: boolean): Record<string, unknown> {
    const type = ElementRegistry.get().get(node.typeId);
    if (!type) return {};
    const props = this.normalizeProperties(node.properties);
    const result = type.toJsonUi(props);

    const bindings = Container.isBooted() ? Container.resolve<BindingService>(BindingService.NAME).get(node.id) : [];
    if (bindings.length > 0) result["bindings"] = bindings.map(b => this.exportBinding(b));

    if (isRoot && node.children.length > 0) {
      result["controls"] = node.children.map(child => ({ [child.name]: { type: child.typeId } }));
    } else if (!isRoot && node.children.length > 0) {
      result["controls"] = node.children.map(child => ({ [child.name]: { type: child.typeId } }));
    }
    return result;
  }

  private collectControls(root: ElementNode): ElementNode[] {
    const out: ElementNode[] = [];
    const walk = (node: ElementNode) => {
      for (const child of node.children) {
        out.push(child);
        walk(child);
      }
    };
    walk(root);
    return out;
  }

  private exportBinding(binding: { binding_name: string; binding_type?: string; source_property_name?: string; target_property_name?: string }): Record<string, unknown> {
    const out: Record<string, unknown> = { binding_name: binding.binding_name };
    if (binding.binding_type) out["binding_type"] = binding.binding_type;
    if (binding.source_property_name) out["source_property_name"] = binding.source_property_name;
    if (binding.target_property_name) out["target_property_name"] = binding.target_property_name;
    return out;
  }

  private normalizeProperties(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === "string" && value === "") continue;
      out[key] = value;
    }
    return out;
  }
}
