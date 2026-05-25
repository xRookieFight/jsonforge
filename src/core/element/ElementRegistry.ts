import { ModuleMapping } from "../base/ModuleMapping";
import { ElementType } from "./base/ElementType";

export class ElementRegistry {
  private static instance: ElementRegistry | null = null;
  private readonly mapping = new ModuleMapping<ElementType>();

  public static get(): ElementRegistry {
    if (!ElementRegistry.instance) ElementRegistry.instance = new ElementRegistry();
    return ElementRegistry.instance;
  }

  public register(type: ElementType): void {
    this.mapping.register(type);
  }

  public require(id: string): ElementType {
    return this.mapping.require(id);
  }

  public get(id: string): ElementType | undefined {
    return this.mapping.get(id);
  }

  public list(): ElementType[] {
    return this.mapping.list();
  }

  public byCategory(): Map<string, ElementType[]> {
    const map = new Map<string, ElementType[]>();
    for (const type of this.mapping.list()) {
      const cat = type.metadata().category;
      const bucket = map.get(cat) ?? [];
      bucket.push(type);
      map.set(cat, bucket);
    }
    return map;
  }
}
