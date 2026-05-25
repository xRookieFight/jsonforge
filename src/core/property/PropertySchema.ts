import { PropertyDescriptor, PropertyValue } from "./base/PropertyType";

export class PropertySchema {
  private readonly descriptors: PropertyDescriptor[] = [];
  private readonly index = new Map<string, PropertyDescriptor>();

  public add<T extends PropertyValue>(descriptor: PropertyDescriptor<T>): PropertySchema {
    this.descriptors.push(descriptor as PropertyDescriptor);
    this.index.set(descriptor.key, descriptor as PropertyDescriptor);
    return this;
  }

  public list(): PropertyDescriptor[] {
    return [...this.descriptors];
  }

  public groups(): Map<string, PropertyDescriptor[]> {
    const map = new Map<string, PropertyDescriptor[]>();
    for (const descriptor of this.descriptors) {
      const bucket = map.get(descriptor.group) ?? [];
      bucket.push(descriptor);
      map.set(descriptor.group, bucket);
    }
    return map;
  }

  public get(key: string): PropertyDescriptor | undefined {
    return this.index.get(key);
  }

  public defaults(): Record<string, PropertyValue> {
    const out: Record<string, PropertyValue> = {};
    for (const descriptor of this.descriptors) out[descriptor.key] = descriptor.default as PropertyValue;
    return out;
  }

  public merge(other: PropertySchema): PropertySchema {
    for (const descriptor of other.descriptors) {
      if (!this.index.has(descriptor.key)) {
        this.descriptors.push(descriptor);
        this.index.set(descriptor.key, descriptor);
      }
    }
    return this;
  }
}
