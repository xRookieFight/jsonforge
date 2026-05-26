import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";
import { ElementNode } from "../element/ElementNode";
import { ProjectTemplates, TemplateId } from "./templates/ProjectTemplates";
import { nanoid } from "nanoid";

export interface ProjectMeta {
  id: string;
  name: string;
  namespace: string;
  rootId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSnapshot {
  meta: ProjectMeta;
  root: ReturnType<ElementNode["toData"]>;
}

export class ProjectService extends Service {
  public static readonly NAME = "ProjectService";
  public readonly bus = new EventBus();

  private meta: ProjectMeta | null = null;
  private root: ElementNode | null = null;
  private dirty = false;

  public getName(): string {
    return ProjectService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.PROJECT;
  }

  public createNew(name: string, namespace: string, template: TemplateId = "server_form"): void {
    const { root } = ProjectTemplates.build(template);
    const meta: ProjectMeta = {
      id: nanoid(12),
      name,
      namespace,
      rootId: root.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.set(meta, root);
  }

  public set(meta: ProjectMeta, root: ElementNode): void {
    this.meta = meta;
    this.root = root;
    this.dirty = false;
    this.bus.emit("project:changed", { meta, root });
  }

  public getMeta(): ProjectMeta {
    if (!this.meta) throw new Error("No project loaded.");
    return this.meta;
  }

  public getRoot(): ElementNode {
    if (!this.root) throw new Error("No project loaded.");
    return this.root;
  }

  public hasProject(): boolean {
    return this.meta !== null && this.root !== null;
  }

  public markDirty(): void {
    if (!this.meta) return;
    this.dirty = true;
    this.meta.updatedAt = Date.now();
    this.bus.emit("project:dirty", true);
    this.bus.emit("project:tree-changed", this.root);
  }

  public markClean(): void {
    this.dirty = false;
    this.bus.emit("project:dirty", false);
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public snapshot(): ProjectSnapshot {
    if (!this.meta || !this.root) throw new Error("No project loaded.");
    return { meta: { ...this.meta }, root: this.root.toData() };
  }

  public load(snapshot: ProjectSnapshot): void {
    this.set({ ...snapshot.meta }, ElementNode.fromData(snapshot.root));
  }

  public renameProject(name: string): void {
    if (!this.meta) return;
    this.meta.name = name;
    this.markDirty();
  }

  public setNamespace(namespace: string): void {
    if (!this.meta) return;
    this.meta.namespace = namespace;
    this.markDirty();
  }

  public close(): void {
    this.meta = null;
    this.root = null;
    this.dirty = false;
    this.bus.emit("project:closed", null);
  }
}
