import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Eye,
  Minus,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Undo2
} from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementNode } from "../../core/element/ElementNode";
import { useEditorStore } from "../../state/editorStore";
import { useProjectStore } from "../../state/projectStore";
import { ElementRenderer } from "../canvas/ElementRenderer";
import { SelectionOverlay } from "../canvas/SelectionOverlay";
import { ResolvedBox } from "../canvas/anchorMath";
import { dragPointer } from "../canvas/dragPointer";
import { AlignMode, alignEntries } from "../canvas/alignment";
import { HistoryService } from "../../core/services/HistoryService";

export function CanvasPanel() {
  const version = useProjectStore(s => s.version);
  const clearSelection = useProjectStore(s => s.clearSelection);
  const selection = useProjectStore(s => s.selection);
  const canUndo = useProjectStore(s => s.canUndo);
  const canRedo = useProjectStore(s => s.canRedo);
  const commitPropertyBatch = useProjectStore(s => s.commitPropertyBatch);
  const setPropertyLive = useProjectStore(s => s.setPropertyLive);
  const zoom = useEditorStore(s => s.zoom);
  const panX = useEditorStore(s => s.panX);
  const panY = useEditorStore(s => s.panY);
  const showGrid = useEditorStore(s => s.showGrid);
  const gridSize = useEditorStore(s => s.gridSize);
  const uiScale = useEditorStore(s => s.uiScale);
  const viewMode = useEditorStore(s => s.viewMode);
  const toggleViewMode = useEditorStore(s => s.toggleViewMode);
  const viewportBg = useEditorStore(s => s.viewportBgColor);
  const viewportImage = useEditorStore(s => s.viewportBgImage);
  const setPan = useEditorStore(s => s.setPan);
  const zoomAt = useEditorStore(s => s.zoomAt);
  const zoomIn = useEditorStore(s => s.zoomIn);
  const zoomOut = useEditorStore(s => s.zoomOut);

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
      // Firefox reports the delta in lines (deltaMode 1) or pages (2) instead
      // of pixels, so the raw value has to be normalised before it is used.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const delta = e.deltaY * unit;
      if (delta === 0) return;
      const rect = node.getBoundingClientRect();
      const factor = Math.exp(-delta * 0.0015);
      zoomAt(useEditorStore.getState().zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    node.addEventListener("wheel", wheelHandler, { passive: false });
    return () => node.removeEventListener("wheel", wheelHandler);
    // `root` matters: the canvas element only exists once a project is loaded,
    // so the listener has to be attached when it appears.
  }, [zoomAt, root]);

  /** Zoom so the whole screen fits the panel, with a little margin. */
  const fitToView = useCallback(() => {
    const node = containerRef.current;
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!node || !project.hasProject()) return;
    const size = (project.getRoot().properties["size"] as [number, number]) ?? [384, 216];
    const rect = node.getBoundingClientRect();
    const scale = useEditorStore.getState().uiScale;
    const fit = Math.min(rect.width / (size[0] * scale), rect.height / (size[1] * scale)) * 0.92;
    useEditorStore.getState().setZoom(fit);
    setPan(0, 0);
  }, [setPan]);

  useEffect(() => {
    if (!root) return;
    fitToView();
    // Only when a different project tree arrives, not on every edit.
  }, [root?.id, fitToView]);

  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
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
      // Pointer capture keeps the drag alive outside the panel and guarantees
      // the release event, so the canvas never stays stuck in pan mode.
      dragPointer(e, {
        move: ev => setPan(origX + (ev.clientX - startX), origY + (ev.clientY - startY))
      });
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
      onPointerDown={handlePanStart}
      onContextMenu={e => e.preventDefault()}
      onClick={e => {
        if ((e.target as HTMLElement).classList.contains("jf-canvas")) clearSelection();
      }}
      style={{ background: viewportBg }}
    >
      <div
        className="jf-canvas__stage"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom * uiScale})`,
          transformOrigin: "0 0",
          position: "absolute",
          left: "50%",
          top: "50%",
          // The stage is scaled from its top left corner, so the centring
          // margin has to follow the zoom as well.
          marginLeft: (-rootSize[0] * uiScale * zoom) / 2,
          marginTop: (-rootSize[1] * uiScale * zoom) / 2,
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
            imageRendering: "pixelated",
            ["--jf-canvas-scale" as string]: String(zoom * uiScale)
          } as React.CSSProperties}
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
        onReset={fitToView}
        onIn={zoomIn}
        onOut={zoomOut}
        zoom={zoom}
        spaceDown={spaceDown}
        viewMode={viewMode}
        onToggleView={toggleViewMode}
        hasSelection={selection.length > 0}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => Container.resolve<HistoryService>(HistoryService.NAME).undo()}
        onRedo={() => Container.resolve<HistoryService>(HistoryService.NAME).redo()}
        onAlign={mode => {
          const nodes = selection
            .map(id => root.findById(id))
            .filter((n): n is ElementNode => n !== null);
          const entries = alignEntries(nodes, mode, rootBox);
          if (entries.length === 0) return;
          // commitPropertyBatch only records the step; the values still have to
          // be written for the canvas to move.
          for (const entry of entries) setPropertyLive(entry.elementId, entry.key, entry.next);
          commitPropertyBatch(entries, "Align");
        }}
      />
    </div>
  );
}

interface ToolbarProps {
  zoom: number;
  spaceDown: boolean;
  viewMode: "edit" | "preview";
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleView(): void;
  onReset(): void;
  onIn(): void;
  onOut(): void;
  onUndo(): void;
  onRedo(): void;
  onAlign(mode: AlignMode): void;
}

const ALIGN_BUTTONS: Array<{ mode: AlignMode; title: string; icon: typeof AlignStartVertical }> = [
  { mode: "left", title: "Align left", icon: AlignStartVertical },
  { mode: "center-h", title: "Center horizontally", icon: AlignCenterVertical },
  { mode: "right", title: "Align right", icon: AlignEndVertical },
  { mode: "top", title: "Align top", icon: AlignStartHorizontal },
  { mode: "center-v", title: "Center vertically", icon: AlignCenterHorizontal },
  { mode: "bottom", title: "Align bottom", icon: AlignEndHorizontal }
];

function CanvasToolbar({
  zoom,
  spaceDown,
  viewMode,
  hasSelection,
  canUndo,
  canRedo,
  onToggleView,
  onReset,
  onIn,
  onOut,
  onUndo,
  onRedo,
  onAlign
}: ToolbarProps) {
  return (
    <div className="jf-canvas__toolbar" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      <button type="button" className="jf-icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={13} strokeWidth={1.75} />
      </button>
      <button type="button" className="jf-icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={13} strokeWidth={1.75} />
      </button>
      <span className="jf-canvas__divider" />
      {ALIGN_BUTTONS.map(({ mode, title, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          className="jf-icon-btn"
          title={title}
          disabled={!hasSelection}
          onClick={() => onAlign(mode)}
        >
          <Icon size={13} strokeWidth={1.75} />
        </button>
      ))}
      <span className="jf-canvas__divider" />
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
