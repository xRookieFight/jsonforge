import { ServiceRegistry } from "../base/ServiceRegistry";
import { Service } from "../base/Service";

export class Container {
  private static booted = false;

  public static async boot(services: Service[]): Promise<void> {
    if (Container.booted) return;
    const registry = ServiceRegistry.get();
    for (const service of services) registry.register(service);
    await registry.loadAll();
    await registry.enableAll();
    Container.booted = true;
  }

  public static async shutdown(): Promise<void> {
    if (!Container.booted) return;
    await ServiceRegistry.get().disableAll();
    Container.booted = false;
  }

  public static resolve<T extends Service>(name: string): T {
    return ServiceRegistry.get().resolve<T>(name);
  }

  public static isBooted(): boolean {
    return Container.booted;
  }
}
