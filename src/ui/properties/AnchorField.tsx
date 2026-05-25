const ANCHORS = [
  "top_left", "top_middle", "top_right",
  "left_middle", "center", "right_middle",
  "bottom_left", "bottom_middle", "bottom_right"
];

interface Props {
  value: string;
  onChange(value: string): void;
}

export function AnchorField({ value, onChange }: Props) {
  return (
    <div className="jf-anchor">
      {ANCHORS.map(anchor => (
        <button
          key={anchor}
          type="button"
          title={anchor.replace(/_/g, " ")}
          className={"jf-anchor__cell" + (value === anchor ? " jf-anchor__cell--active" : "")}
          onClick={() => onChange(anchor)}
        >
          <span />
        </button>
      ))}
    </div>
  );
}
