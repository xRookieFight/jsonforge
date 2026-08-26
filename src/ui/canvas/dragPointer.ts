import { PointerEvent as ReactPointerEvent } from "react";

export interface DragHandlers {
  move(event: PointerEvent): void;
  end?(event: PointerEvent | null): void;
}

/**
 * Runs a drag on top of pointer capture.
 *
 * Window level mousemove/mouseup listeners lose the release when the pointer
 * leaves the window or the button comes up over another surface, and the drag
 * stays stuck. Capturing the pointer on the element that started the drag
 * guarantees every move and the final up land here - plus pointercancel, which
 * fires when the browser takes the gesture away.
 */
export function dragPointer(event: ReactPointerEvent, handlers: DragHandlers): void {
  const target = event.currentTarget as HTMLElement;
  const pointerId = event.pointerId;

  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Capture may be refused (pointer already gone); the listeners still work.
  }

  let pending: PointerEvent | null = null;
  let frame = 0;

  const flush = (): void => {
    frame = 0;
    const ev = pending;
    pending = null;
    if (ev) handlers.move(ev);
  };

  const cleanup = (last: PointerEvent | null): void => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    // Apply whatever the last frame did not get to draw.
    if (pending) {
      const ev = pending;
      pending = null;
      handlers.move(ev);
    }
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerup", onUp);
    target.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", onBlur);
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    handlers.end?.(last);
  };

  const onMove = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    // No button left down means the release was swallowed somewhere else.
    if (ev.buttons === 0) {
      cleanup(ev);
      return;
    }
    // Pointer events fire faster than the screen refreshes; collapse them so
    // the drag does at most one update per frame.
    pending = ev;
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const onUp = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    cleanup(ev);
  };
  const onCancel = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    cleanup(null);
  };
  const onBlur = (): void => cleanup(null);

  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerup", onUp);
  target.addEventListener("pointercancel", onCancel);
  window.addEventListener("blur", onBlur);
}
