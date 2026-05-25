import { Module } from "./Module";

export class ModuleMapping<T extends Module> {
  private readonly modules = new Map<string, T>();

  public register(module: T): void {
    if (this.modules.has(module.getName())) {
      throw new Error(`Module already registered: ${module.getName()}`);
    }
    this.modules.set(module.getName(), module);
    module.onRegister?.();
  }

  public unregister(name: string): void {
    const module = this.modules.get(name);
    if (!module) return;
    module.onUnregister?.();
    this.modules.delete(name);
  }

  public get(name: string): T | undefined {
    return this.modules.get(name);
  }

  public require(name: string): T {
    const module = this.modules.get(name);
    if (!module) throw new Error(`Module not found: ${name}`);
    return module;
  }

  public has(name: string): boolean {
    return this.modules.has(name);
  }

  public list(): T[] {
    return [...this.modules.values()];
  }

  public names(): string[] {
    return [...this.modules.keys()];
  }

  public clear(): void {
    for (const module of this.modules.values()) {
      module.onUnregister?.();
    }
    this.modules.clear();
  }
}
