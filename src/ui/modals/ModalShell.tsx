import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  open: boolean;
  onClose(): void;
  children: ReactNode;
  width?: number;
}

export function ModalShell({ title, open, onClose, children, width = 480 }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="jf-modal__backdrop" onMouseDown={onClose}>
      <div
        className="jf-modal__shell"
        style={{ width }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="jf-modal__header">
          <span>{title}</span>
          <button type="button" className="jf-icon-btn" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="jf-modal__body">{children}</div>
      </div>
    </div>
  );
}
