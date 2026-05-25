import { useMemo } from "react";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { useProjectStore } from "../../state/projectStore";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { iconForElement } from "../icons/elementIcons";

const CATEGORY_LABEL: Record<string, string> = {
  container: "Containers",
  control: "Controls",
  input: "Inputs",
  display: "Display"
};

export function ToolboxPanel() {
  const primary = useProjectStore(s => s.primarySelection);
  const rootName = useProjectStore(s => s.rootName);
  const addChild = useProjectStore(s => s.addChild);

  const grouped = useMemo(() => {
    const map = ElementRegistry.get().byCategory();
    return [...map.entries()];
  }, []);

  const resolveTarget = (): string | null => {
    if (primary) {
      const project = Container.resolve<ProjectService>(ProjectService.NAME);
      const node = project.getRoot().findById(primary);
      const type = node ? ElementRegistry.get().get(node.typeId) : null;
      if (node && type?.metadata().acceptsChildren) return node.id;
      if (node?.parent) return node.parent.id;
    }
    try {
      return Container.resolve<ProjectService>(ProjectService.NAME).getRoot().id;
    } catch {
      return null;
    }
  };

  const handleAdd = (typeId: string) => {
    const target = resolveTarget();
    if (!target) return;
    addChild(target, typeId);
  };

  return (
    <div className="jf-panel jf-toolbox">
      <div className="jf-panel__hint">
        Add into:&nbsp;<strong>{primary ? "selected" : rootName}</strong>
        {!primary && <span className="jf-panel__hint-dim"> (or pick parent in hierarchy)</span>}
      </div>
      {grouped.map(([category, types]) => (
        <div key={category} className="jf-toolbox__group">
          <div className="jf-toolbox__heading">{CATEGORY_LABEL[category] ?? category}</div>
          <div className="jf-toolbox__grid">
            {types.map(type => {
              const meta = type.metadata();
              const Icon = iconForElement(meta.id);
              return (
                <button
                  key={meta.id}
                  type="button"
                  className="jf-tool-btn"
                  title={meta.label}
                  onClick={() => handleAdd(meta.id)}
                >
                  <Icon size={18} strokeWidth={1.75} className="jf-tool-btn__icon" />
                  <span className="jf-tool-btn__label">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
