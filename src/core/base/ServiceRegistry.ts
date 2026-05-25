import { Service } from "./Service";

export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;
  private readonly services = new Map<string, Service>();
  private sortedCache: Service[] | null = null;

  public static get(): ServiceRegistry {
    if (!ServiceRegistry.instance) ServiceRegistry.instance = new ServiceRegistry();
    return ServiceRegistry.instance;
  }

  public register(service: Service): void {
    if (this.services.has(service.getName())) {
      throw new Error(`Service already registered: ${service.getName()}`);
    }
    this.services.set(service.getName(), service);
    this.sortedCache = null;
  }

  public unregister(name: string): void {
    this.services.delete(name);
    this.sortedCache = null;
  }

  public resolve<T extends Service>(name: string): T {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service not found: ${name}`);
    return service as T;
  }

  public has(name: string): boolean {
    return this.services.has(name);
  }

  public async loadAll(): Promise<void> {
    for (const service of this.sorted()) {
      await service.onLoad();
    }
  }

  public async enableAll(): Promise<void> {
    for (const service of this.sorted()) {
      await service.onEnable();
    }
  }

  public async disableAll(): Promise<void> {
    for (const service of [...this.sorted()].reverse()) {
      await service.onDisable();
    }
  }

  private sorted(): Service[] {
    if (!this.sortedCache) {
      this.sortedCache = [...this.services.values()].sort(
        (a, b) => a.getPriority() - b.getPriority()
      );
    }
    return this.sortedCache;
  }
}
