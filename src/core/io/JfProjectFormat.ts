import { Container } from "../di/Container";
import { ProjectService, ProjectSnapshot } from "../services/ProjectService";
import { BindingService, BindingDescriptor } from "../services/BindingService";
import { TextureService } from "../services/TextureService";
import { PersistenceService } from "../services/PersistenceService";
import { ElementNode } from "../element/ElementNode";

export interface JfProjectTextureEntry {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  nineSlice: [number, number, number, number];
  data: string;
}

export interface JfProjectBundle {
  format: "jfproject";
  version: 1;
  generator: string;
  exportedAt: number;
  meta: ProjectSnapshot["meta"];
  root: ProjectSnapshot["root"];
  bindings: Record<string, BindingDescriptor[]>;
  textures: JfProjectTextureEntry[];
}

export class JfProjectFormat {
  public static readonly EXTENSION = "jfproject";
  public static readonly MIME = "application/vnd.jsonforge.project+json";

  public static async export(): Promise<string> {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!project.hasProject()) throw new Error("No project loaded.");
    const snapshot = project.snapshot();

    const bindings = Container.resolve<BindingService>(BindingService.NAME).all();
    const usedBindings: Record<string, BindingDescriptor[]> = {};
    for (const [id, list] of bindings) usedBindings[id] = list;

    const textureService = Container.resolve<TextureService>(TextureService.NAME);
    const usedTextures = JfProjectFormat.collectTextureNames(snapshot.root);
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    const textureEntries: JfProjectTextureEntry[] = [];
    for (const meta of textureService.list()) {
      if (usedTextures.size > 0 && !usedTextures.has(meta.name) && !usedTextures.has(meta.id)) continue;
      const row = await persistence.getTexture(meta.id);
      if (!row) continue;
      const data = await JfProjectFormat.blobToBase64(row.blob);
      textureEntries.push({
        id: meta.id,
        name: meta.name,
        mime: meta.mime,
        width: meta.width,
        height: meta.height,
        nineSlice: meta.nineSlice,
        data
      });
    }

    const bundle: JfProjectBundle = {
      format: "jfproject",
      version: 1,
      generator: "JsonForge",
      exportedAt: Date.now(),
      meta: snapshot.meta,
      root: snapshot.root,
      bindings: usedBindings,
      textures: textureEntries
    };
    return JSON.stringify(bundle, null, 2);
  }

  public static async import(text: string): Promise<void> {
    const bundle = JSON.parse(text) as Partial<JfProjectBundle>;
    if (bundle.format !== "jfproject") throw new Error("Not a .jfproject file.");
    if (bundle.version !== 1) throw new Error(`Unsupported .jfproject version: ${bundle.version}`);
    if (!bundle.meta || !bundle.root) throw new Error("Bundle missing meta or root.");

    const root = ElementNode.fromData(bundle.root);
    Container.resolve<ProjectService>(ProjectService.NAME).set(bundle.meta, root);

    const bindingService = Container.resolve<BindingService>(BindingService.NAME);
    for (const [elementId, list] of Object.entries(bundle.bindings ?? {})) {
      bindingService.set(elementId, list);
    }

    const textureService = Container.resolve<TextureService>(TextureService.NAME);
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    const existing = new Set(textureService.list().map(t => t.id));
    for (const entry of bundle.textures ?? []) {
      if (existing.has(entry.id)) continue;
      const blob = await JfProjectFormat.base64ToBlob(entry.data, entry.mime);
      await persistence.putTexture(entry.id, entry.name, entry.mime, blob);
    }

    if ((bundle.textures ?? []).length > 0) {
      await textureService.onDisable();
      await textureService.onEnable();
    }
  }

  private static collectTextureNames(rootData: ProjectSnapshot["root"]): Set<string> {
    const out = new Set<string>();
    const walk = (data: { properties: Record<string, unknown>; children: ProjectSnapshot["root"][] }) => {
      const tex = data.properties["texture"];
      if (typeof tex === "string" && tex.length > 0) out.add(tex);
      for (const child of data.children ?? []) walk(child);
    };
    walk(rootData);
    return out;
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private static async base64ToBlob(data: string, mime: string): Promise<Blob> {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  public static metaSummary(text: string): { name: string; namespace: string; textureCount: number; bindingCount: number } {
    const bundle = JSON.parse(text) as Partial<JfProjectBundle>;
    return {
      name: bundle.meta?.name ?? "unknown",
      namespace: bundle.meta?.namespace ?? "",
      textureCount: bundle.textures?.length ?? 0,
      bindingCount: Object.keys(bundle.bindings ?? {}).length
    };
  }
}
