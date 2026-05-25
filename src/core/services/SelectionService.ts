import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";

export class SelectionService extends Service {
  public static readonly NAME = "SelectionService";
  public readonly bus = new EventBus();

  private selected = new Set<string>();
  private primaryId: string | null = null;

  public getName(): string {
    return SelectionService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.SELECTION;
  }

  public select(id: string): void {
    this.selected.clear();
    this.selected.add(id);
    this.primaryId = id;
    this.emit();
  }

  public toggle(id: string): void {
    if (this.selected.has(id)) {
      this.selected.delete(id);
      if (this.primaryId === id) this.primaryId = this.lastSelected();
    } else {
      this.selected.add(id);
      this.primaryId = id;
    }
    this.emit();
  }

  public clear(): void {
    this.selected.clear();
    this.primaryId = null;
    this.emit();
  }

  public selectMany(ids: string[]): void {
    this.selected = new Set(ids);
    this.primaryId = ids[ids.length - 1] ?? null;
    this.emit();
  }

  public has(id: string): boolean {
    return this.selected.has(id);
  }

  public ids(): string[] {
    return [...this.selected];
  }

  public primary(): string | null {
    return this.primaryId;
  }

  public size(): number {
    return this.selected.size;
  }

  private lastSelected(): string | null {
    const arr = [...this.selected];
    return arr[arr.length - 1] ?? null;
  }

  private emit(): void {
    this.bus.emit("selection:changed", { ids: this.ids(), primary: this.primaryId });
  }
}
