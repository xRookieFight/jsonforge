import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Scaling } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { ElementNode } from "../../core/element/ElementNode";
import { useProjectStore } from "../../state/projectStore";
import { PropertyField } from "../properties/PropertyField";
import { PropertyDescriptor, PropertyValue } from "../../core/property/base/PropertyType";
import { PropertyEntry } from "../canvas/textureDrop";

export function PropertiesPanel() {
  const version = useProjectStore(s => s.version);
  const primary = useProjectStore(s => s.primarySelection);
  const setProperty = useProjectStore(s => s.setProperty);
  const setPropertyLive = useProjectStore(s => s.setPropertyLive);
  const commitPropertyBatch = useProjectStore(s => s.commitPropertyBatch);
  const renameElement = useProjectStore(s => s.renameElement);

  const [node, setNode] = useState<ElementNode | null>(null);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!primary || !project.hasProject()) {
      setNode(null);
      return;
    }
    setNode(project.getRoot().findById(primary));
  }, [primary, version]);

  if (!node) {
    return (
      <div className="jf-panel jf-properties jf-properties--empty">
        Select an element to edit properties.
      </div>
    );
  }

  const type = ElementRegistry.get().get(node.typeId);
  if (!type) return <div className="jf-panel jf-properties">Unknown type.</div>;

  const schema = type.schema();
  const groups = schema.groups();

  return (
    <div className="jf-panel jf-properties">
      <div className="jf-properties__header">
        <input
          className="jf-input jf-properties__name"
          type="text"
          defaultValue={node.name}
          key={node.id + "-" + version}
          onBlur={e => {
            if (e.target.value && e.target.value !== node.name) renameElement(node.id, e.target.value);
          }}
        />
        <div className="jf-properties__type">{type.metadata().label}</div>
      </div>
      <ScaleTool
        node={node}
        onApply={entries => {
          for (const entry of entries) setPropertyLive(entry.elementId, entry.key, entry.next);
          commitPropertyBatch(entries, "Scale");
        }}
      />
      {[...groups.entries()].map(([groupName, descriptors]) => (
        <PropertyGroup key={groupName} name={groupName} descriptors={descriptors} node={node} onChange={setProperty} />
      ))}
    </div>
  );
}

interface GroupProps {
  name: string;
  descriptors: PropertyDescriptor[];
  node: ElementNode;
  onChange(id: string, key: string, value: PropertyValue): void;
}

/**
 * Resizes an element and everything under it by a factor.
 *
 * Sizes and offsets are absolute numbers, so shrinking a container alone would
 * leave its children at the original size. This walks the subtree and scales
 * size, offset and font scale together, in one undo step.
 */
function ScaleTool({ node, onApply }: { node: ElementNode; onApply(entries: PropertyEntry[]): void }) {
  const [factor, setFactor] = useState("0.8");

  const apply = () => {
    const value = Number(factor);
    if (!Number.isFinite(value) || value <= 0 || value === 1) return;

    const entries: PropertyEntry[] = [];
    const round = (n: number) => Math.round(n * 10) / 10;

    const walk = (current: ElementNode, isRoot: boolean) => {
      const size = current.properties["size"] as [number, number] | undefined;
      if (Array.isArray(size)) {
        entries.push({
          elementId: current.id,
          key: "size",
          prev: size,
          next: [round(size[0] * value), round(size[1] * value)]
        });
      }
      // The element being scaled keeps its position; its children move with it.
      const offset = current.properties["offset"] as [number, number] | undefined;
      if (!isRoot && Array.isArray(offset)) {
        entries.push({
          elementId: current.id,
          key: "offset",
          prev: offset,
          next: [round(offset[0] * value), round(offset[1] * value)]
        });
      }
      const fontScale = current.properties["font_scale_factor"];
      if (typeof fontScale === "number") {
        entries.push({
          elementId: current.id,
          key: "font_scale_factor",
          prev: fontScale,
          next: Math.round(fontScale * value * 100) / 100
        });
      }
      for (const child of current.children) walk(child, false);
    };

    walk(node, true);
    if (entries.length > 0) onApply(entries);
  };

  return (
    <div className="jf-properties__scale">
      <Scaling size={13} strokeWidth={1.75} />
      <span>Scale with children</span>
      <input
        className="jf-input jf-input--inline"
        type="number"
        min={0.1}
        max={8}
        step={0.05}
        value={factor}
        onChange={e => setFactor(e.target.value)}
      />
      <button type="button" className="jf-btn" onClick={apply}>
        Apply
      </button>
    </div>
  );
}

function PropertyGroup({ name, descriptors, node, onChange }: GroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="jf-properties__group">
      <button type="button" className={"jf-properties__group-head" + (open ? "" : " jf-properties__group-head--closed")} onClick={() => setOpen(!open)}>
        <span className="jf-properties__caret">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        {name}
      </button>
      {open && (
        <div className="jf-properties__body">
          {descriptors.map(descriptor => {
            const value = (node.properties[descriptor.key] ?? descriptor.default) as PropertyValue;
            return (
              <div className="jf-properties__row" key={descriptor.key}>
                <label className="jf-properties__label" title={descriptor.description}>
                  {descriptor.label}
                </label>
                <div className="jf-properties__field">
                  <PropertyField descriptor={descriptor} value={value} onChange={v => onChange(node.id, descriptor.key, v)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
