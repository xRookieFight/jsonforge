interface Props {
  value: string;
  onChange(value: string): void;
}

export function ColorField({ value, onChange }: Props) {
  return (
    <div className="jf-color">
      <input
        className="jf-color__swatch"
        type="color"
        value={value || "#ffffff"}
        onChange={e => onChange(e.target.value)}
      />
      <input
        className="jf-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
