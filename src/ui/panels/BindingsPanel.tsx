import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Container } from "../../core/di/Container";
import { BindingService, BindingDescriptor } from "../../core/services/BindingService";
import { useProjectStore } from "../../state/projectStore";
import { nanoid } from "nanoid";

export function BindingsPanel() {
  const primary = useProjectStore(s => s.primarySelection);
  const [bindings, setBindings] = useState<BindingDescriptor[]>([]);

  useEffect(() => {
    if (!primary) {
      setBindings([]);
      return;
    }
    const service = Container.resolve<BindingService>(BindingService.NAME);
    setBindings(service.get(primary));
    const off = service.bus.on<{ elementId: string; bindings: BindingDescriptor[] }>("binding:changed", payload => {
      if (payload.elementId === primary) setBindings(payload.bindings);
    });
    return () => off();
  }, [primary]);

  if (!primary) return <div className="jf-panel jf-bindings jf-bindings--empty">Select an element to manage bindings.</div>;

  const service = Container.resolve<BindingService>(BindingService.NAME);

  const updateBinding = (idx: number, patch: Partial<BindingDescriptor>) => {
    const next = bindings.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    setBindings(next);
    service.set(primary, next);
  };

  const addBinding = () => {
    const next: BindingDescriptor[] = [
      ...bindings,
      { id: nanoid(8), binding_name: "", binding_type: "global" }
    ];
    setBindings(next);
    service.set(primary, next);
  };

  const removeBinding = (idx: number) => {
    const next = bindings.filter((_, i) => i !== idx);
    setBindings(next);
    service.set(primary, next);
  };

  return (
    <div className="jf-panel jf-bindings">
      <div className="jf-bindings__toolbar">
        <button type="button" className="jf-btn" onClick={addBinding}>
          <Plus size={13} strokeWidth={2} />
          <span>Binding</span>
        </button>
      </div>
      <div className="jf-bindings__list">
        {bindings.map((binding, idx) => (
          <div className="jf-binding" key={binding.id}>
            <div className="jf-binding__head">
              <span className="jf-binding__index">#{idx + 1}</span>
              <button type="button" className="jf-icon-btn" onClick={() => removeBinding(idx)}>
                <X size={12} strokeWidth={2} />
              </button>
            </div>
            <div className="jf-binding__row">
              <label>binding_name</label>
              <input className="jf-input" value={binding.binding_name} onChange={e => updateBinding(idx, { binding_name: e.target.value })} />
            </div>
            <div className="jf-binding__row">
              <label>binding_type</label>
              <select
                className="jf-input jf-select"
                value={binding.binding_type ?? "global"}
                onChange={e => updateBinding(idx, { binding_type: e.target.value as BindingDescriptor["binding_type"] })}
              >
                <option value="global">global</option>
                <option value="view">view</option>
                <option value="collection">collection</option>
                <option value="collection_details">collection_details</option>
                <option value="none">none</option>
              </select>
            </div>
            <div className="jf-binding__row">
              <label>source_property</label>
              <input className="jf-input" value={binding.source_property_name ?? ""} onChange={e => updateBinding(idx, { source_property_name: e.target.value })} />
            </div>
            <div className="jf-binding__row">
              <label>target_property</label>
              <input className="jf-input" value={binding.target_property_name ?? ""} onChange={e => updateBinding(idx, { target_property_name: e.target.value })} />
            </div>
          </div>
        ))}
        {bindings.length === 0 && <div className="jf-bindings__empty">No bindings on this element.</div>}
      </div>
    </div>
  );
}
