import { useEffect, useRef, useState } from "react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { useProjectStore } from "../../state/projectStore";
import { ResolvedBox, computeBox } from "./anchorMath";
import { ElementNode } from "../../core/element/ElementNode";
import { useEditorStore } from "../../state/editorStore";
import { dragPointer } from "./dragPointer";
import { TEXTURE_MIME, TEXTURE_SLOTS, applyTexture } from "./textureDrop";

interface Props {
  rootBox: ResolvedBox;
}

interface Handle {
  id: string;
  axis: "x" | "y" | "xy";
  cursor: string;
  dx: number;
  dy: number;
}

const HANDLES: Handle[] = [
  { id: "tl", axis: "xy", cursor: "nwse-resize", dx: -1, dy: -1 },
  { id: "tm", axis: "y", cursor: "ns-resize", dx: 0, dy: -1 },
  { id: "tr", axis: "xy", cursor: "nesw-resize", dx: 1, dy: -1 },
  { id: "ml", axis: "x", cursor: "ew-resize", dx: -1, dy: 0 },
  { id: "mr", axis: "x", cursor: "ew-resize", dx: 1, dy: 0 },
  { id: "bl", axis: "xy", cursor: "nesw-resize", dx: -1, dy: 1 },
  { id: "bm", axis: "y", cursor: "ns-resize", dx: 0, dy: 1 },
  { id: "br", axis: "xy", cursor: "nwse-resize", dx: 1, dy: 1 }
];

export function SelectionOverlay({ rootBox }: Props) {
  const version = useProjectStore(s => s.version);
  const primary = useProjectStore(s => s.primarySelection);
  const setPropertyLive = useProjectStore(s => s.setPropertyLive);
  const commitPropertyBatch = useProjectStore(s => s.commitPropertyBatch);
  const zoom = useEditorStore(s => s.zoom);
  const uiScale = useEditorStore(s => s.uiScale);
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const gridSize = useEditorStore(s => s.gridSize);

  const [box, setBox] = useState<ResolvedBox | null>(null);
  const [node, setNode] = useState<ElementNode | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  /** Left/top the dragged element started the gesture at, in units. */
  const targetOrigin = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if (!primary) {
      setBox(null);
      setNode(null);
      return;
    }
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!project.hasProject()) return;
    const found = project.getRoot().findById(primary);
    if (!found) {
      setBox(null);
      setNode(null);
      return;
    }
    setNode(found);
    const path = found.path();
    let parentBox: ResolvedBox = rootBox;
    for (let i = 1; i < path.length; i++) {
      const current = path[i];
      const size = (current.properties["size"] as [number, number]) ?? [120, 40];
      const offset = (current.properties["offset"] as [number, number]) ?? [0, 0];
      const anchorFrom = (current.properties["anchor_from"] as string) ?? "center";
      const anchorTo = (current.properties["anchor_to"] as string) ?? "center";
      parentBox = computeBox(parentBox, size, offset, anchorFrom, anchorTo);
    }
    setBox(parentBox);
  }, [primary, version, rootBox]);

  // Canvas pixels per UI unit while dragging: zoom and the game-like scale.
  const pixelsPerUnit = zoom * uiScale;

  const snap = (value: number): number => {
    if (!snapToGrid || gridSize <= 0) return Math.round(value);
    return Math.round(value / gridSize) * gridSize;
  };

  /**
   * Preview of a gesture, painted straight onto the DOM.
   *
   * Pushing every pointer frame through the store re-renders the whole editor
   * (tree, properties, JSON preview) sixty times a second, which is what made
   * dragging feel heavy. During the gesture only the two boxes on screen move;
   * the store gets one commit at the end.
   */
  const previewBox = (offsetDelta: [number, number], size: [number, number] | null): void => {
    const shell = shellRef.current;
    if (!shell || !box) return;
    const target = shell.parentElement?.querySelector<HTMLElement>(`[data-element-id="${node?.id}"]`);

    const left = box.x + offsetDelta[0];
    const top = box.y + offsetDelta[1];
    shell.style.left = `${left}px`;
    shell.style.top = `${top}px`;
    if (target) {
      target.style.left = `${targetOrigin.current[0] + offsetDelta[0]}px`;
      target.style.top = `${targetOrigin.current[1] + offsetDelta[1]}px`;
    }

    if (!size) return;
    shell.style.width = `${size[0]}px`;
    shell.style.height = `${size[1]}px`;
    if (target) {
      target.style.width = `${size[0]}px`;
      target.style.height = `${size[1]}px`;
    }
    const handleOffset = 5 / pixelsPerUnit;
    for (const element of shell.querySelectorAll<HTMLElement>(".jf-selection__handle")) {
      const id = element.dataset.handle;
      const handle = HANDLES.find(h => h.id === id);
      if (!handle) continue;
      element.style.left = `${handle.dx === -1 ? -handleOffset : handle.dx === 1 ? size[0] - handleOffset : size[0] / 2 - handleOffset}px`;
      element.style.top = `${handle.dy === -1 ? -handleOffset : handle.dy === 1 ? size[1] - handleOffset : size[1] / 2 - handleOffset}px`;
    }
  };

  const rememberTargetOrigin = (): void => {
    const target = shellRef.current?.parentElement?.querySelector<HTMLElement>(
      `[data-element-id="${node?.id}"]`
    );
    targetOrigin.current = target
      ? [parseFloat(target.style.left || "0"), parseFloat(target.style.top || "0")]
      : [0, 0];
  };

  const startMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!node || e.button !== 0) return;
    const id = node.id;
    const origOffset = ((node.properties["offset"] as [number, number]) ?? [0, 0]).slice() as [number, number];
    const startX = e.clientX;
    const startY = e.clientY;
    let last: [number, number] = origOffset;
    rememberTargetOrigin();

    dragPointer(e, {
      move: ev => {
        last = [
          snap(origOffset[0] + (ev.clientX - startX) / pixelsPerUnit),
          snap(origOffset[1] + (ev.clientY - startY) / pixelsPerUnit)
        ];
        previewBox([last[0] - origOffset[0], last[1] - origOffset[1]], null);
      },
      end: () => {
        if (last[0] === origOffset[0] && last[1] === origOffset[1]) return;
        // The gesture only painted the DOM; the value still has to reach the
        // tree, otherwise the next render throws the move away.
        setPropertyLive(id, "offset", last);
        commitPropertyBatch([{ elementId: id, key: "offset", prev: origOffset, next: last }], "Move");
      }
    });
  };

  const startResize = (e: React.PointerEvent, handle: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    if (!node || e.button !== 0) return;
    const id = node.id;
    const origSize = ((node.properties["size"] as [number, number]) ?? [120, 40]).slice() as [number, number];
    const startX = e.clientX;
    const startY = e.clientY;
    let last: [number, number] = origSize;
    rememberTargetOrigin();

    dragPointer(e, {
      move: ev => {
        const dx = ((ev.clientX - startX) / pixelsPerUnit) * handle.dx;
        const dy = ((ev.clientY - startY) / pixelsPerUnit) * handle.dy;
        last = [Math.max(1, snap(origSize[0] + dx)), Math.max(1, snap(origSize[1] + dy))];
        previewBox([0, 0], last);
      },
      end: () => {
        if (last[0] === origSize[0] && last[1] === origSize[1]) return;
        setPropertyLive(id, "size", last);
        commitPropertyBatch([{ elementId: id, key: "size", prev: origSize, next: last }], "Resize");
      }
    });
  };

  if (!box || !node) return null;

  const handleSize = 10 / pixelsPerUnit;

  return (
    <div
      className="jf-selection"
      ref={shellRef}
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        pointerEvents: "none"
      }}
    >
      <div
        className="jf-selection__move"
        style={{ position: "absolute", inset: 0, pointerEvents: "auto", cursor: "move" }}
        onPointerDown={startMove}
        onDragOver={e => {
          if (TEXTURE_SLOTS[node.typeId] && e.dataTransfer.types.includes(TEXTURE_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={e => {
          const key = TEXTURE_SLOTS[node.typeId];
          if (!key) return;
          const name = e.dataTransfer.getData(TEXTURE_MIME);
          if (!name) return;
          e.preventDefault();
          e.stopPropagation();
          applyTexture(node, key, name, setPropertyLive, commitPropertyBatch);
        }}
      />
      {HANDLES.map(handle => (
        <div
          key={handle.id}
          className={"jf-selection__handle jf-selection__handle--" + handle.id}
          data-handle={handle.id}
          style={{
            position: "absolute",
            width: handleSize,
            height: handleSize,
            background: "var(--jf-accent)",
            border: `${1 / pixelsPerUnit}px solid #fff`,
            pointerEvents: "auto",
            cursor: handle.cursor,
            left:
              handle.dx === -1
                ? -handleSize / 2
                : handle.dx === 1
                  ? box.width - handleSize / 2
                  : box.width / 2 - handleSize / 2,
            top:
              handle.dy === -1
                ? -handleSize / 2
                : handle.dy === 1
                  ? box.height - handleSize / 2
                  : box.height / 2 - handleSize / 2
          }}
          onPointerDown={e => startResize(e, handle)}
        />
      ))}
      <div
        className="jf-selection__info"
        style={{
          position: "absolute",
          top: -22 / pixelsPerUnit,
          left: 0,
          background: "var(--jf-accent)",
          color: "var(--jf-accent-contrast)",
          fontSize: 11 / pixelsPerUnit,
          padding: `${1 / pixelsPerUnit}px ${6 / pixelsPerUnit}px`,
          borderRadius: 3 / pixelsPerUnit,
          pointerEvents: "none",
          whiteSpace: "nowrap"
        }}
      >
        {node.name} · {Math.round(box.width)}×{Math.round(box.height)}
      </div>
    </div>
  );
}
