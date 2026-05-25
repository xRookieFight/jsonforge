import { ModalShell } from "./ModalShell";
import { useEditorStore } from "../../state/editorStore";

interface Props {
  open: boolean;
  onClose(): void;
}

export function SettingsModal({ open, onClose }: Props) {
  const gridSize = useEditorStore(s => s.gridSize);
  const setGridSize = useEditorStore(s => s.setGridSize);
  const showGrid = useEditorStore(s => s.showGrid);
  const toggleGrid = useEditorStore(s => s.toggleGrid);
  const snapToGrid = useEditorStore(s => s.snapToGrid);
  const toggleSnap = useEditorStore(s => s.toggleSnap);
  const viewportBgColor = useEditorStore(s => s.viewportBgColor);
  const setViewportBgColor = useEditorStore(s => s.setViewportBgColor);

  return (
    <ModalShell title="Settings" open={open} onClose={onClose}>
      <div className="jf-form">
        <div className="jf-form__row">
          <label>Grid Size</label>
          <input
            className="jf-input"
            type="number"
            min={1}
            step={1}
            value={gridSize}
            onChange={e => setGridSize(Number(e.target.value))}
          />
        </div>
        <div className="jf-form__row">
          <label>Show Grid</label>
          <label className="jf-switch">
            <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
            <span className="jf-switch__slider" />
          </label>
        </div>
        <div className="jf-form__row">
          <label>Snap to Grid</label>
          <label className="jf-switch">
            <input type="checkbox" checked={snapToGrid} onChange={toggleSnap} />
            <span className="jf-switch__slider" />
          </label>
        </div>
        <div className="jf-form__row">
          <label>Viewport Background</label>
          <input
            type="color"
            value={viewportBgColor}
            onChange={e => setViewportBgColor(e.target.value)}
          />
        </div>
        <div className="jf-form__actions">
          <button type="button" className="jf-btn jf-btn--primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </ModalShell>
  );
}
