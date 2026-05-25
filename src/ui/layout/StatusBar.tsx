import { useProjectStore } from "../../state/projectStore";
import { useEditorStore } from "../../state/editorStore";

export function StatusBar() {
  const selection = useProjectStore(s => s.selection);
  const dirty = useProjectStore(s => s.dirty);
  const zoom = useEditorStore(s => s.zoom);
  const showGrid = useEditorStore(s => s.showGrid);
  const snap = useEditorStore(s => s.snapToGrid);
  const toggleGrid = useEditorStore(s => s.toggleGrid);
  const toggleSnap = useEditorStore(s => s.toggleSnap);
  const toggleRulers = useEditorStore(s => s.toggleRulers);
  const showRulers = useEditorStore(s => s.showRulers);

  return (
    <div className="jf-statusbar">
      <div className="jf-statusbar__group">
        <span>{selection.length} selected</span>
        <span>·</span>
        <span>{dirty ? "Unsaved changes" : "Clean"}</span>
      </div>
      <div className="jf-statusbar__group">
        <button type="button" className={"jf-pill" + (showGrid ? " jf-pill--on" : "")} onClick={toggleGrid}>grid</button>
        <button type="button" className={"jf-pill" + (snap ? " jf-pill--on" : "")} onClick={toggleSnap}>snap</button>
        <button type="button" className={"jf-pill" + (showRulers ? " jf-pill--on" : "")} onClick={toggleRulers}>rulers</button>
        <span>zoom {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
