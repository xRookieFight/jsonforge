import { useEffect, useState } from "react";
import { Undo2, Redo2, Trash2 } from "lucide-react";
import { Container } from "../../core/di/Container";
import { HistoryService, Command } from "../../core/services/HistoryService";
import { useProjectStore } from "../../state/projectStore";

export function HistoryPanel() {
  const version = useProjectStore(s => s.version);
  const [list, setList] = useState<Command[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    setList(history.history());
    setCanUndo(history.canUndo());
    setCanRedo(history.canRedo());
  }, [version]);

  const undo = () => Container.resolve<HistoryService>(HistoryService.NAME).undo();
  const redo = () => Container.resolve<HistoryService>(HistoryService.NAME).redo();
  const clear = () => Container.resolve<HistoryService>(HistoryService.NAME).clear();

  return (
    <div className="jf-panel jf-history">
      <div className="jf-history__toolbar">
        <button type="button" className="jf-btn" disabled={!canUndo} onClick={undo}>
          <Undo2 size={13} strokeWidth={1.75} />
          <span>Undo</span>
        </button>
        <button type="button" className="jf-btn" disabled={!canRedo} onClick={redo}>
          <Redo2 size={13} strokeWidth={1.75} />
          <span>Redo</span>
        </button>
        <button type="button" className="jf-btn jf-btn--ghost" onClick={clear}>
          <Trash2 size={13} strokeWidth={1.75} />
          <span>Clear</span>
        </button>
      </div>
      <div className="jf-history__list">
        {list.length === 0 && <div className="jf-history__empty">No actions yet.</div>}
        {list.map((cmd, idx) => (
          <div key={idx} className="jf-history__row">
            <span className="jf-history__index">{idx + 1}</span>
            <span className="jf-history__label">{cmd.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
