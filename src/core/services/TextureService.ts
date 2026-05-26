import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";
import { PersistenceService } from "./PersistenceService";
import { Container } from "../di/Container";
import { nanoid } from "nanoid";

export interface TextureMeta {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  nineSlice: [number, number, number, number];
  url: string;
}

export class TextureService extends Service {
  public static readonly NAME = "TextureService";
  public readonly bus = new EventBus();

  private readonly cache = new Map<string, TextureMeta>();

  public getName(): string {
    return TextureService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.TEXTURE;
  }

  public async onEnable(): Promise<void> {
    await super.onEnable();
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    const stored = await persistence.listTextures();
    for (const row of stored) {
      if (this.cache.has(row.id)) continue;
      const meta = await this.buildMeta(row.id, row.name, row.mime, row.blob);
      this.cache.set(meta.id, meta);
    }
    await this.loadVanillaManifest();
    this.bus.emit("texture:list", this.list());
  }

  private async loadVanillaManifest(): Promise<void> {
    try {
      const res = await fetch("vanilla/manifest.json");
      if (!res.ok) return;
      const data = await res.json() as { textures?: Array<{ name: string; path: string; nineSlice?: [number, number, number, number] }> };
      const entries = data.textures ?? [];
      for (const entry of entries) {
        const id = "vanilla:" + entry.name;
        if (this.cache.has(id)) continue;
        const url = "vanilla/" + entry.path.replace(/^\/+/, "");
        const probe = await fetch(url, { method: "HEAD" }).catch(() => null);
        if (!probe || !probe.ok) continue;
        const dims = await this.measure(url);
        this.cache.set(id, {
          id,
          name: entry.name,
          mime: "image/png",
          width: dims.width,
          height: dims.height,
          nineSlice: entry.nineSlice ?? [0, 0, 0, 0],
          url
        });
      }
    } catch {
      /* manifest missing or invalid — ignore, app still works without vanilla pack */
    }
  }

  public async onDisable(): Promise<void> {
    await super.onDisable();
    for (const meta of this.cache.values()) URL.revokeObjectURL(meta.url);
    this.cache.clear();
  }

  public async upload(file: File): Promise<TextureMeta> {
    const id = nanoid(10);
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    await persistence.putTexture(id, file.name, file.type, file);
    const meta = await this.buildMeta(id, file.name, file.type, file);
    this.cache.set(id, meta);
    this.bus.emit("texture:added", meta);
    this.bus.emit("texture:list", this.list());
    return meta;
  }

  public async remove(id: string): Promise<void> {
    const meta = this.cache.get(id);
    if (meta) URL.revokeObjectURL(meta.url);
    this.cache.delete(id);
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    await persistence.deleteTexture(id);
    this.bus.emit("texture:removed", id);
    this.bus.emit("texture:list", this.list());
  }

  public setNineSlice(id: string, value: [number, number, number, number]): void {
    const meta = this.cache.get(id);
    if (!meta) return;
    meta.nineSlice = value;
    this.bus.emit("texture:updated", meta);
  }

  public get(id: string): TextureMeta | undefined {
    return this.cache.get(id);
  }

  public list(): TextureMeta[] {
    return [...this.cache.values()];
  }

  private async buildMeta(id: string, name: string, mime: string, blob: Blob): Promise<TextureMeta> {
    const url = URL.createObjectURL(blob);
    const dims = await this.measure(url);
    return {
      id,
      name,
      mime,
      width: dims.width,
      height: dims.height,
      nineSlice: [0, 0, 0, 0],
      url
    };
  }

  private measure(url: string): Promise<{ width: number; height: number }> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  }
}
