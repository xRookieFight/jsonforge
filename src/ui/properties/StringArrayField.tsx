import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";

interface Props {
  value: string[];
  onChange(value: string[]): void;
}

export function StringArrayField({ value, onChange }: Props) {
  const [items, setItems] = useState<string[]>(value);
  useEffect(() => setItems(value), [value]);

  const update = (idx: number, raw: string) => {
    const next = [...items];
    next[idx] = raw;
    setItems(next);
  };

  return (
    <div className="jf-array">
      {items.map((item, idx) => (
        <div className="jf-array__row" key={idx}>
          <input
            className="jf-input"
            type="text"
            value={item}
            onChange={e => update(idx, e.target.value)}
            onBlur={() => onChange(items)}
          />
          <button
            type="button"
            className="jf-icon-btn"
            onClick={() => {
              const next = items.filter((_, i) => i !== idx);
              setItems(next);
              onChange(next);
            }}
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="jf-btn jf-btn--ghost"
        onClick={() => {
          const next = [...items, ""];
          setItems(next);
          onChange(next);
        }}
      >
        <Plus size={12} strokeWidth={2} />
        <span>Add</span>
      </button>
    </div>
  );
}
