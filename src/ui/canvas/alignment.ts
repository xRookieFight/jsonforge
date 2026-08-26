import { ElementNode } from "../../core/element/ElementNode";
import { ResolvedBox, computeBox } from "./anchorMath";
import { PropertyEntry } from "./textureDrop";

export type AlignMode = "left" | "center-h" | "right" | "top" | "center-v" | "bottom";

/**
 * Box the node would occupy with a zero offset.
 *
 * Alignment cannot just write an offset: where the element lands also depends
 * on its anchors. Measuring the neutral position first turns "put it in the
 * middle" into a plain difference, whatever the anchors are.
 */
function baseBox(node: ElementNode, rootBox: ResolvedBox): { parent: ResolvedBox; box: ResolvedBox } | null {
  const path = node.path();
  let parent = rootBox;
  for (let i = 1; i < path.length - 1; i++) {
    const current = path[i];
    parent = computeBox(
      parent,
      (current.properties["size"] as [number, number]) ?? [120, 40],
      (current.properties["offset"] as [number, number]) ?? [0, 0],
      (current.properties["anchor_from"] as string) ?? "center",
      (current.properties["anchor_to"] as string) ?? "center"
    );
  }
  if (path.length < 2) return null;
  const box = computeBox(
    parent,
    (node.properties["size"] as [number, number]) ?? [120, 40],
    [0, 0],
    (node.properties["anchor_from"] as string) ?? "center",
    (node.properties["anchor_to"] as string) ?? "center"
  );
  return { parent, box };
}

/** Offsets that put the given nodes at the requested edge of their parent. */
export function alignEntries(nodes: ElementNode[], mode: AlignMode, rootBox: ResolvedBox): PropertyEntry[] {
  const entries: PropertyEntry[] = [];

  for (const node of nodes) {
    if (node.locked) continue;
    const measured = baseBox(node, rootBox);
    if (!measured) continue;
    const { parent, box } = measured;
    const prev = ((node.properties["offset"] as [number, number]) ?? [0, 0]).slice() as [number, number];

    let target = box.x;
    let horizontal = true;
    switch (mode) {
      case "left":
        target = parent.x;
        break;
      case "center-h":
        target = parent.x + (parent.width - box.width) / 2;
        break;
      case "right":
        target = parent.x + parent.width - box.width;
        break;
      case "top":
        target = parent.y;
        horizontal = false;
        break;
      case "center-v":
        target = parent.y + (parent.height - box.height) / 2;
        horizontal = false;
        break;
      case "bottom":
        target = parent.y + parent.height - box.height;
        horizontal = false;
        break;
    }

    const next: [number, number] = horizontal
      ? [Math.round(target - box.x), prev[1]]
      : [prev[0], Math.round(target - box.y)];

    if (next[0] === prev[0] && next[1] === prev[1]) continue;
    entries.push({ elementId: node.id, key: "offset", prev, next });
  }

  return entries;
}
