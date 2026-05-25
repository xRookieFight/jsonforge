import { NumberField } from "./NumberField";

interface Props {
  value: [number, number, number, number];
  labels?: [string, string, string, string];
  onChange(value: [number, number, number, number]): void;
}

export function Vec4Field({ value, labels = ["L", "T", "R", "B"], onChange }: Props) {
  return (
    <div className="jf-vec jf-vec--4">
      {value.map((v, i) => (
        <div className="jf-vec__cell" key={i}>
          <span className="jf-vec__axis">{labels[i]}</span>
          <NumberField
            value={v}
            onChange={nv => {
              const next = [...value] as [number, number, number, number];
              next[i] = nv;
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}
