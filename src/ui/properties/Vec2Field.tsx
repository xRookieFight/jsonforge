import { NumberField } from "./NumberField";

interface Props {
  value: [number, number];
  step?: number;
  onChange(value: [number, number]): void;
}

export function Vec2Field({ value, step, onChange }: Props) {
  const [x, y] = value;
  return (
    <div className="jf-vec">
      <div className="jf-vec__cell">
        <span className="jf-vec__axis jf-vec__axis--x">X</span>
        <NumberField value={x} step={step} onChange={nx => onChange([nx, y])} />
      </div>
      <div className="jf-vec__cell">
        <span className="jf-vec__axis jf-vec__axis--y">Y</span>
        <NumberField value={y} step={step} onChange={ny => onChange([x, ny])} />
      </div>
    </div>
  );
}
