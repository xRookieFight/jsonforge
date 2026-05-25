import { useEffect, useRef, useState } from "react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { useProjectStore } from "../../state/projectStore";
import { ResolvedBox, computeBox } from "./anchorMath";
import { ElementNode } from "../../core/element/ElementNode";
import { useEditorStore } from "../../state/editorStore";

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
  const setProperty = useProjectStore(s => s.setProperty);
  const zoom = useEditorStore(s => s.zoom);
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const gridSize = useEditorStore(s => s.gridSize);

  const [box, setBox] = useState<ResolvedBox | null>(null);
  const [node, setNode] = useState<ElementNode | null>(null);
  const drag = useRef<{ kind: "move" | "resize"; handle?: Handle; startX: number; startY: number; origOffset: [number, number]; origSize: [number, number] } | null>(null);

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

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current || !node) return;
      const dx = (e.clientX - drag.current.startX) / zoom;
      const dy = (e.clientY - drag.current.startY) / zoom;
      if (drag.current.kind === "move") {
        let nx = drag.current.origOffset[0] + dx;
        let ny = drag.current.origOffset[1] + dy;
        if (snapToGrid && gridSize > 0) {
          nx = Math.round(nx / gridSize) * gridSize;
          ny = Math.round(ny / gridSize) * gridSize;
        }
        setProperty(node.id, "offset", [Math.round(nx), Math.round(ny)]);
      } else if (drag.current.kind === "resize" && drag.current.handle) {
        const handle = drag.current.handle;
        let nw = drag.current.origSize[0] + dx * handle.dx;
        let nh = drag.current.origSize[1] + dy * handle.dy;
        nw = Math.max(4, nw);
        nh = Math.max(4, nh);
        if (snapToGrid && gridSize > 0) {
          nw = Math.round(nw / gridSize) * gridSize;
          nh = Math.round(nh / gridSize) * gridSize;
        }
        setProperty(node.id, "size", [Math.round(nw), Math.round(nh)]);
      }
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    if (drag.current) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  if (!box || !node) return null;

  const startMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    drag.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      origOffset: ((node.properties["offset"] as [number, number]) ?? [0, 0]).slice() as [number, number],
      origSize: ((node.properties["size"] as [number, number]) ?? [120, 40]).slice() as [number, number]
    };
    const onMove = (ev: MouseEvent) => {
      if (!drag.current || !node) return;
      const dx = (ev.clientX - drag.current.startX) / zoom;
      const dy = (ev.clientY - drag.current.startY) / zoom;
      let nx = drag.current.origOffset[0] + dx;
      let ny = drag.current.origOffset[1] + dy;
      if (snapToGrid && gridSize > 0) {
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }
      setProperty(node.id, "offset", [Math.round(nx), Math.round(ny)]);
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation();
    const origOffset = ((node.properties["offset"] as [number, number]) ?? [0, 0]).slice() as [number, number];
    const origSize = ((node.properties["size"] as [number, number]) ?? [120, 40]).slice() as [number, number];
    drag.current = {
      kind: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origOffset,
      origSize
    };
    const onMove = (ev: MouseEvent) => {
      if (!drag.current || !drag.current.handle || !node) return;
      const dx = (ev.clientX - drag.current.startX) / zoom;
      const dy = (ev.clientY - drag.current.startY) / zoom;
      let nw = drag.current.origSize[0] + dx * drag.current.handle.dx;
      let nh = drag.current.origSize[1] + dy * drag.current.handle.dy;
      nw = Math.max(4, nw);
      nh = Math.max(4, nh);
      if (snapToGrid && gridSize > 0) {
        nw = Math.round(nw / gridSize) * gridSize;
        nh = Math.round(nh / gridSize) * gridSize;
      }
      setProperty(node.id, "size", [Math.round(nw), Math.round(nh)]);
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="jf-selection"
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
        onMouseDown={startMove}
      />
      {HANDLES.map(handle => (
        <div
          key={handle.id}
          className={"jf-selection__handle jf-selection__handle--" + handle.id}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            background: "var(--jf-accent)",
            border: "1px solid #fff",
            pointerEvents: "auto",
            cursor: handle.cursor,
            left: handle.dx === -1 ? -5 : handle.dx === 1 ? box.width - 5 : box.width / 2 - 5,
            top: handle.dy === -1 ? -5 : handle.dy === 1 ? box.height - 5 : box.height / 2 - 5
          }}
          onMouseDown={e => startResize(e, handle)}
        />
      ))}
      <div
        className="jf-selection__info"
        style={{
          position: "absolute",
          top: -22,
          left: 0,
          background: "var(--jf-accent)",
          color: "#000",
          fontSize: 11,
          padding: "1px 6px",
          borderRadius: 3,
          pointerEvents: "none",
          whiteSpace: "nowrap"
        }}
      >
        {node.name} · {Math.round(box.width)}×{Math.round(box.height)}
      </div>
    </div>
  );
}
