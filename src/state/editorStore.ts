import { create } from "zustand";

export type CanvasMode = "select" | "pan" | "marquee";
export type ViewMode = "edit" | "preview";

interface EditorState {
  canvasMode: CanvasMode;
  viewMode: ViewMode;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showRulers: boolean;
  showOutlines: boolean;
  scale: number;
  viewportBgColor: string;
  viewportBgImage: string | null;

  setCanvasMode(mode: CanvasMode): void;
  setViewMode(mode: ViewMode): void;
  toggleViewMode(): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  toggleGrid(): void;
  toggleSnap(): void;
  toggleOutlines(): void;
  toggleRulers(): void;
  setGridSize(size: number): void;
  setScale(scale: number): void;
  setViewportBgColor(color: string): void;
  setViewportBgImage(url: string | null): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomReset(): void;
  zoomAt(zoom: number, anchorX: number, anchorY: number): void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvasMode: "select",
  viewMode: "edit",
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  snapToGrid: false,
  gridSize: 10,
  showRulers: true,
  showOutlines: true,
  scale: 1,
  viewportBgColor: "#202125",
  viewportBgImage: null,

  setCanvasMode: mode => set({ canvasMode: mode }),
  setViewMode: viewMode => set({ viewMode }),
  toggleViewMode: () => set(s => ({ viewMode: s.viewMode === "edit" ? "preview" : "edit" })),
  setZoom: zoom => set({ zoom: clamp(zoom, 0.1, 8) }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set(s => ({ snapToGrid: !s.snapToGrid })),
  toggleOutlines: () => set(s => ({ showOutlines: !s.showOutlines })),
  toggleRulers: () => set(s => ({ showRulers: !s.showRulers })),
  setGridSize: size => set({ gridSize: Math.max(1, size) }),
  setScale: scale => set({ scale }),
  setViewportBgColor: color => set({ viewportBgColor: color }),
  setViewportBgImage: url => set({ viewportBgImage: url }),
  zoomIn: () => set({ zoom: clamp(get().zoom * 1.2, 0.1, 8) }),
  zoomOut: () => set({ zoom: clamp(get().zoom / 1.2, 0.1, 8) }),
  zoomReset: () => set({ zoom: 1, panX: 0, panY: 0 }),
  zoomAt: (zoom, anchorX, anchorY) => {
    const next = clamp(zoom, 0.1, 8);
    const prev = get().zoom;
    if (next === prev) return;
    const ratio = next / prev;
    const px = get().panX;
    const py = get().panY;
    const newPanX = anchorX - (anchorX - px) * ratio;
    const newPanY = anchorY - (anchorY - py) * ratio;
    set({ zoom: next, panX: newPanX, panY: newPanY });
  }
}));

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
