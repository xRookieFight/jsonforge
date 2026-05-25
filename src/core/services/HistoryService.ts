import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";

export interface Command {
  label: string;
  apply(): void;
  revert(): void;
}

export class HistoryService extends Service {
  public static readonly NAME = "HistoryService";
  public readonly bus = new EventBus();

  private readonly past: Command[] = [];
  private readonly future: Command[] = [];
  private limit = 200;

  public getName(): string {
    return HistoryService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.HISTORY;
  }

  public execute(command: Command): void {
    command.apply();
    this.past.push(command);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
    this.emit();
  }

  public push(command: Command): void {
    this.past.push(command);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
    this.emit();
  }

  public undo(): void {
    const command = this.past.pop();
    if (!command) return;
    command.revert();
    this.future.push(command);
    this.emit();
  }

  public redo(): void {
    const command = this.future.pop();
    if (!command) return;
    command.apply();
    this.past.push(command);
    this.emit();
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public clear(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.emit();
  }

  public history(): Command[] {
    return [...this.past];
  }

  public setLimit(limit: number): void {
    this.limit = Math.max(1, limit);
  }

  private emit(): void {
    this.bus.emit("history:changed", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      pastSize: this.past.length,
      futureSize: this.future.length
    });
  }
}
