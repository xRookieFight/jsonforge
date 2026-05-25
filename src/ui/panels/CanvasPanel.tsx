import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Minus, RotateCcw, Eye, Pencil } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementNode } from "../../core/element/ElementNode";
import { useEditorStore } from "../../state/editorStore";
import { useProjectStore } from "../../state/projectStore";
import { ElementRenderer } from "../canvas/ElementRenderer";
import { SelectionOverlay } from "../canvas/SelectionOverlay";
import { ResolvedBox } from "../canvas/anchorMath";

export function CanvasPanel() {
  const version = useProjectStore(s => s.version);
  const clearSelection = useProjectStore(s => s.clearSelection);
  const zoom = useEditorStore(s => s.zoom);
  const panX = useEditorStore(s => s.panX);
  const panY = useEditorStore(s => s.panY);
  const showGrid = useEditorStore(s => s.showGrid);
  const gridSize = useEditorStore(s => s.gridSize);
  const viewMode = useEditorStore(s => s.viewMode);
  const toggleViewMode = useEditorStore(s => s.toggleViewMode);
  const viewportBg = useEditorStore(s => s.viewportBgColor);
  const viewportImage = useEditorStore(s => s.viewportBgImage);
  const setPan = useEditorStore(s => s.setPan);
  const zoomAt = useEditorStore(s => s.zoomAt);
  const zoomIn = useEditorStore(s => s.zoomIn);
  const zoomOut = useEditorStore(s => s.zoomOut);
  const zoomReset = useEditorStore(s => s.zoomReset);

  const [root, setRoot] = useState<ElementNode | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (project.hasProject()) setRoot(project.getRoot());
    else setRoot(null);
  }, [version]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Space") setSpaceDown(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const ax = e.clientX - rect.left;
      const ay = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(useEditorStore.getState().zoom * factor, ax, ay);
    };
    node.addEventListener("wheel", wheelHandler, { passive: false });
    return () => node.removeEventListener("wheel", wheelHandler);
  }, [zoomAt]);

  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      const isMiddle = e.button === 1;
      const isRight = e.button === 2;
      const isPanModifier = e.altKey || spaceDown || isMiddle || isRight;
      const isLeftEmpty = e.button === 0 && (e.target as HTMLElement).classList.contains("jf-canvas");
      if (!isPanModifier && !isLeftEmpty) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = panX;
      const origY = panY;
      const onMove = (ev: MouseEvent) => {
        setPan(origX + (ev.clientX - startX), origY + (ev.clientY - startY));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [panX, panY, setPan, spaceDown]
  );

  if (!root) {
    return (
      <div className="jf-panel jf-canvas jf-canvas--empty">
        <div className="jf-canvas__empty-content">
          <h2>JsonForge</h2>
          <p>Create a new project or import a JSON UI file to begin.</p>
        </div>
      </div>
    );
  }

  const rootSize = (root.properties["size"] as [number, number]) ?? [1600, 900];
  const rootBox: ResolvedBox = { x: 0, y: 0, width: rootSize[0], height: rootSize[1] };

  return (
    <div
      className={"jf-panel jf-canvas" + (spaceDown ? " jf-canvas--pan" : "")}
      ref={containerRef}
      onMouseDown={handlePanStart}
      onContextMenu={e => e.preventDefault()}
      onClick={e => {
        if ((e.target as HTMLElement).classList.contains("jf-canvas")) clearSelection();
      }}
      style={{ background: viewportBg }}
    >
      <div
        className="jf-canvas__stage"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -rootSize[0] / 2,
          marginTop: -rootSize[1] / 2,
          imageRendering: "pixelated"
        }}
      >
        <div
          className="jf-canvas__board"
          style={{
            position: "relative",
            width: rootSize[0],
            height: rootSize[1],
            background: viewportImage ? `url(${viewportImage}) center/cover` : "rgba(28,29,33,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            imageRendering: "pixelated"
          }}
        >
          {showGrid && viewMode === "edit" && (
            <div
              className="jf-canvas__grid"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage:
                  `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),` +
                  `linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                backgroundSize: `${gridSize}px ${gridSize}px`
              }}
            />
          )}
          {root.children.map(child => (
            <ElementRenderer key={child.id} node={child} parentBox={rootBox} />
          ))}
          <SelectionOverlay rootBox={rootBox} />
        </div>
      </div>
      <CanvasToolbar
        onReset={zoomReset}
        onIn={zoomIn}
        onOut={zoomOut}
        zoom={zoom}
        spaceDown={spaceDown}
        viewMode={viewMode}
        onToggleView={toggleViewMode}
      />
    </div>
  );
}

interface ToolbarProps {
  zoom: number;
  spaceDown: boolean;
  viewMode: "edit" | "preview";
  onToggleView(): void;
  onReset(): void;
  onIn(): void;
  onOut(): void;
}

function CanvasToolbar({ zoom, spaceDown, viewMode, onToggleView, onReset, onIn, onOut }: ToolbarProps) {
  return (
    <div className="jf-canvas__toolbar" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <button
        type="button"
        className={"jf-icon-btn" + (viewMode === "preview" ? " jf-icon-btn--active" : "")}
        title={viewMode === "preview" ? "Switch to edit mode" : "Preview (hide outlines)"}
        onClick={onToggleView}
      >
        {viewMode === "preview" ? <Pencil size={13} strokeWidth={1.75} /> : <Eye size={13} strokeWidth={1.75} />}
      </button>
      <span className="jf-canvas__divider" />
      <button type="button" className="jf-icon-btn" title="Zoom out (wheel down)" onClick={onOut}>
        <Minus size={13} strokeWidth={2} />
      </button>
      <span className="jf-canvas__zoom">{Math.round(zoom * 100)}%</span>
      <button type="button" className="jf-icon-btn" title="Zoom in (wheel up)" onClick={onIn}>
        <Plus size={13} strokeWidth={2} />
      </button>
      <button type="button" className="jf-icon-btn" title="Reset view" onClick={onReset}>
        <RotateCcw size={13} strokeWidth={1.75} />
      </button>
      <span className="jf-canvas__hint">{spaceDown ? "PAN" : "drag · wheel zoom"}</span>
    </div>
  );
}
