import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { ElementNode } from "../../core/element/ElementNode";
import { useProjectStore } from "../../state/projectStore";
import { PropertyField } from "../properties/PropertyField";
import { PropertyDescriptor, PropertyValue } from "../../core/property/base/PropertyType";

export function PropertiesPanel() {
  const version = useProjectStore(s => s.version);
  const primary = useProjectStore(s => s.primarySelection);
  const setProperty = useProjectStore(s => s.setProperty);
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
