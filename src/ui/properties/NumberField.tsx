import { useEffect, useState } from "react";

interface Props {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange(value: number): void;
}

export function NumberField({ value, min, max, step, onChange }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const num = Number(raw);
    if (Number.isFinite(num)) onChange(num);
    else setText(String(value));
  };

  return (
    <input
      className="jf-input jf-input--num"
      type="number"
      value={text}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={e => setText(e.target.value)}
      onBlur={e => commit(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
