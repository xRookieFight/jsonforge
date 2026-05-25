interface Props {
  value: string;
  options: string[];
  onChange(value: string): void;
}

export function EnumField({ value, options, onChange }: Props) {
  return (
    <select className="jf-input jf-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(opt => (
        <option key={opt} value={opt}>
          {opt.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
