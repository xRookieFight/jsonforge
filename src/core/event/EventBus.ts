export type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler<unknown>>>();

  public on<T>(event: string, handler: EventHandler<T>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  public off<T>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  public emit<T>(event: string, payload: T): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const handler of bucket) {
      (handler as EventHandler<T>)(payload);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const globalBus = new EventBus();
