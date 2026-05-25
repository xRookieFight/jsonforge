export type AnchorName =
  | "top_left" | "top_middle" | "top_right"
  | "left_middle" | "center" | "right_middle"
  | "bottom_left" | "bottom_middle" | "bottom_right";

export const ANCHOR_FRACTIONS: Record<AnchorName, [number, number]> = {
  top_left: [0, 0],
  top_middle: [0.5, 0],
  top_right: [1, 0],
  left_middle: [0, 0.5],
  center: [0.5, 0.5],
  right_middle: [1, 0.5],
  bottom_left: [0, 1],
  bottom_middle: [0.5, 1],
  bottom_right: [1, 1]
};

export function resolveAnchor(name: string): [number, number] {
  return ANCHOR_FRACTIONS[name as AnchorName] ?? [0.5, 0.5];
}

export interface ResolvedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeBox(
  parent: ResolvedBox,
  size: [number, number],
  offset: [number, number],
  anchorFrom: string,
  anchorTo: string
): ResolvedBox {
  const [fx, fy] = resolveAnchor(anchorFrom);
  const [tx, ty] = resolveAnchor(anchorTo);
  const px = parent.x + parent.width * tx;
  const py = parent.y + parent.height * ty;
  const x = px - size[0] * fx + offset[0];
  const y = py - size[1] * fy + offset[1];
  return { x, y, width: size[0], height: size[1] };
}
