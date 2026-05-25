import { Service, ServicePriority } from "../base/Service";

export interface Shortcut {
  id: string;
  combo: string;
  description: string;
  handler: () => void;
}

export class KeyboardService extends Service {
  public static readonly NAME = "KeyboardService";

  private readonly shortcuts = new Map<string, Shortcut>();
  private listener: ((e: KeyboardEvent) => void) | null = null;

  public getName(): string {
    return KeyboardService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.KEYBOARD;
  }

  public async onEnable(): Promise<void> {
    await super.onEnable();
    this.listener = (event: KeyboardEvent) => this.handle(event);
    window.addEventListener("keydown", this.listener);
  }

  public async onDisable(): Promise<void> {
    await super.onDisable();
    if (this.listener) window.removeEventListener("keydown", this.listener);
    this.listener = null;
  }

  public register(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  public unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  public list(): Shortcut[] {
    return [...this.shortcuts.values()];
  }

  private handle(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    const combo = this.normalize(event);
    for (const shortcut of this.shortcuts.values()) {
      if (this.normalizeCombo(shortcut.combo) === combo) {
        event.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }

  private normalize(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push("mod");
    if (event.shiftKey) parts.push("shift");
    if (event.altKey) parts.push("alt");
    parts.push(event.key.toLowerCase());
    return parts.join("+");
  }

  private normalizeCombo(combo: string): string {
    return combo
      .toLowerCase()
      .split("+")
      .map(s => s.trim())
      .map(s => (s === "ctrl" || s === "cmd" || s === "meta" ? "mod" : s))
      .join("+");
  }
}
