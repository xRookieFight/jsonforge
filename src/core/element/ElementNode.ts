import { nanoid } from "nanoid";
import { PropertyValue } from "../property/base/PropertyType";

export interface ElementNodeData {
  id: string;
  typeId: string;
  name: string;
  properties: Record<string, PropertyValue>;
  children: ElementNodeData[];
  collapsed?: boolean;
  locked?: boolean;
}

export class ElementNode {
  public id: string;
  public typeId: string;
  public name: string;
  public properties: Record<string, PropertyValue>;
  public children: ElementNode[];
  public parent: ElementNode | null = null;
  public collapsed = false;
  public locked = false;

  public constructor(typeId: string, name: string, properties: Record<string, PropertyValue> = {}) {
    this.id = nanoid(10);
    this.typeId = typeId;
    this.name = name;
    this.properties = properties;
    this.children = [];
  }

  public addChild(child: ElementNode, index?: number): void {
    child.parent = this;
    if (index === undefined || index >= this.children.length) {
      this.children.push(child);
    } else {
      this.children.splice(Math.max(0, index), 0, child);
    }
  }

  public removeChild(child: ElementNode): boolean {
    const idx = this.children.indexOf(child);
    if (idx === -1) return false;
    this.children.splice(idx, 1);
    child.parent = null;
    return true;
  }

  public moveChild(child: ElementNode, newIndex: number): void {
    const idx = this.children.indexOf(child);
    if (idx === -1) return;
    this.children.splice(idx, 1);
    this.children.splice(Math.max(0, Math.min(newIndex, this.children.length)), 0, child);
  }

  public findById(id: string): ElementNode | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const result = child.findById(id);
      if (result) return result;
    }
    return null;
  }

  public path(): ElementNode[] {
    const out: ElementNode[] = [];
    let cur: ElementNode | null = this;
    while (cur) {
      out.unshift(cur);
      cur = cur.parent;
    }
    return out;
  }

  public clone(): ElementNode {
    const copy = new ElementNode(this.typeId, this.name + "_copy", JSON.parse(JSON.stringify(this.properties)));
    copy.collapsed = this.collapsed;
    for (const child of this.children) copy.addChild(child.clone());
    return copy;
  }

  public toData(): ElementNodeData {
    return {
      id: this.id,
      typeId: this.typeId,
      name: this.name,
      properties: this.properties,
      children: this.children.map(c => c.toData()),
      collapsed: this.collapsed,
      locked: this.locked
    };
  }

  public static fromData(data: ElementNodeData): ElementNode {
    const node = new ElementNode(data.typeId, data.name, data.properties);
    node.id = data.id;
    node.collapsed = data.collapsed ?? false;
    node.locked = data.locked ?? false;
    for (const childData of data.children ?? []) {
      node.addChild(ElementNode.fromData(childData));
    }
    return node;
  }
}
