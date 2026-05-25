interface Props {
  value: boolean;
  onChange(value: boolean): void;
}

export function BooleanField({ value, onChange }: Props) {
  return (
    <label className="jf-switch">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span className="jf-switch__slider" />
    </label>
  );
}
