import { Service, ServicePriority } from "../base/Service";
import { EventBus } from "../event/EventBus";
import { PersistenceService } from "./PersistenceService";
import { Container } from "../di/Container";
import { nanoid } from "nanoid";

export type TextureSource = "user" | "vanilla" | "preset";

export interface TextureMeta {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  nineSlice: [number, number, number, number];
  /**
   * Logical size the nine-slice borders refer to. Comes from the sidecar json
   * of a preset and may differ from the pixel size of the PNG.
   */
  baseSize?: [number, number];
  url: string;
  source: TextureSource;
  /** Preset style folder the texture belongs to, when source is "preset". */
  style?: string;
}

/** Preset styles shipped in public/presets/textures. */
export const PRESET_STYLES = [
  "other_ore-ui_style",
  "red_ore-ui_style",
  "pink_ore-ui_style",
  "eternal_ore-ui_style",
  "turquoise_ore-ui_style"
] as const;

interface PresetMapping {
  data?: Array<{ image: string; nineslice?: boolean }>;
}

interface PresetNineslice {
  nineslice_size?: number | number[];
  base_size?: number | [number, number];
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
    await this.loadPresets();
    this.bus.emit("texture:list", this.list());
  }

  /**
   * Loads the bundled preset styles. Each style folder carries a mapping.json
   * listing its images plus a sibling .json per texture with the nine-slice
   * data of the original art.
   */
  private async loadPresets(): Promise<void> {
    for (const style of PRESET_STYLES) {
      const base = "presets/textures/" + style;
      let mapping: PresetMapping;
      try {
        const res = await fetch(base + "/mapping.json");
        if (!res.ok) continue;
        mapping = await res.json() as PresetMapping;
      } catch {
        continue;
      }
      for (const entry of mapping.data ?? []) {
        const name = "textures/ui/" + style + "/" + entry.image;
        const id = "preset:" + style + "/" + entry.image;
        if (this.cache.has(id)) continue;
        const url = base + "/" + entry.image + ".png";
        const dims = await this.measure(url);
        if (dims.width === 0) continue;
        const sidecar = await this.loadPresetNineslice(url, entry.nineslice === true);
        this.cache.set(id, {
          id,
          name,
          mime: "image/png",
          width: dims.width,
          height: dims.height,
          nineSlice: sidecar.nineSlice,
          baseSize: sidecar.baseSize,
          url,
          source: "preset",
          style
        });
      }
    }
  }

  private async loadPresetNineslice(
    pngUrl: string,
    hasNineslice: boolean
  ): Promise<{ nineSlice: [number, number, number, number]; baseSize?: [number, number] }> {
    const none = { nineSlice: [0, 0, 0, 0] as [number, number, number, number] };
    if (!hasNineslice) return none;
    try {
      const res = await fetch(pngUrl.replace(/\.png$/i, ".json"));
      if (!res.ok) return none;
      const data = await res.json() as PresetNineslice;
      const base = data.base_size;
      const baseSize: [number, number] | undefined =
        typeof base === "number" ? [base, base] : Array.isArray(base) ? [base[0], base[1]] : undefined;
      const size = data.nineslice_size;
      if (typeof size === "number") return { nineSlice: [size, size, size, size], baseSize };
      if (Array.isArray(size)) {
        const [l = 0, t = 0, r = l, b = t] = size;
        return { nineSlice: [l, t, r, b], baseSize };
      }
    } catch {
      /* no sibling json - texture is used without nine-slice */
    }
    return none;
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
          url,
          source: "vanilla"
        });
      }
    } catch {
      /* manifest missing or invalid — ignore, app still works without vanilla pack */
    }
  }

  public async onDisable(): Promise<void> {
    await super.onDisable();
    for (const meta of this.cache.values()) {
      if (meta.source === "user") URL.revokeObjectURL(meta.url);
    }
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
    // Bundled textures are part of the app, not of the user library.
    if (meta && meta.source !== "user") return;
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

  /**
   * Raw bytes of a texture.
   *
   * Uploaded textures are read straight from storage: their object URL is only
   * good for `<img>`, and fetching a blob: URL is not something every browser
   * (or content policy) allows.
   */
  public async getBytes(id: string): Promise<Uint8Array | null> {
    const meta = this.cache.get(id);
    if (!meta) return null;
    if (meta.source === "user") {
      const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
      const row = await persistence.getTexture(id);
      if (!row) return null;
      return new Uint8Array(await row.blob.arrayBuffer());
    }
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }

  public findByName(name: string): TextureMeta | undefined {
    for (const meta of this.cache.values()) {
      if (meta.name === name) return meta;
    }
    return undefined;
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
      url,
      source: "user"
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
