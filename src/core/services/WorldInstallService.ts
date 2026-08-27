/**
 * Installs a built pack straight into a Minecraft world.
 *
 * Exporting a .mcaddon and importing it by hand is the shipping route; this is
 * the testing one. The archive is unpacked into the world's own `resource_packs`
 * and `behavior_packs` folders and the two `world_*_packs.json` lists are
 * pointed at it, which is exactly what an import would have done - minus the
 * game restart needed to pick the file up.
 *
 * The pack folder is REPLACED rather than written over: Minecraft indexes the
 * textures of a pack when it loads it, so a file left behind from an earlier
 * build keeps being served and a newly added one is never seen.
 */
import JSZip from "jszip";
import { Service, ServicePriority } from "../base/Service";
import { Container } from "../di/Container";
import { PlatformService } from "./PlatformService";
import { MinecraftWorld } from "../../platform/PlatformBridge";
import { AddonBuildResult } from "../addon/AddonTypes";

/** One of the two pack lists a world keeps. */
interface PackList {
  file: string;
  folder: string;
}

const PACK_LISTS: Record<"resources" | "data", PackList> = {
  resources: { file: "world_resource_packs.json", folder: "resource_packs" },
  data: { file: "world_behavior_packs.json", folder: "behavior_packs" }
};

interface PackEntry {
  pack_id: string;
  version: [number, number, number];
}

export interface WorldInstallResult {
  world: MinecraftWorld;
  /** Folders written inside the world, for the report in the dialog. */
  packs: string[];
}

export class WorldInstallService extends Service {
  public static readonly NAME = "WorldInstallService";

  public getName(): string {
    return WorldInstallService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.EXPORT;
  }

  public async listWorlds(): Promise<MinecraftWorld[]> {
    const platform = Container.resolve<PlatformService>(PlatformService.NAME);
    if (!platform.isElectron()) return [];
    try {
      return await platform.getBridge().listWorlds();
    } catch {
      return [];
    }
  }

  public async install(result: AddonBuildResult, world: MinecraftWorld): Promise<WorldInstallResult> {
    const bridge = Container.resolve<PlatformService>(PlatformService.NAME).getBridge();
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());

    // A .mcaddon holds a folder per pack; a .mcpack is a single pack with its
    // manifest at the root. Both end up as one folder inside the world.
    const roots = this.packRoots(zip);
    if (roots.length === 0) throw new Error("The built pack has no manifest.");

    const written: string[] = [];
    for (const root of roots) {
      const manifest = JSON.parse(await this.text(zip, root ? `${root}/manifest.json` : "manifest.json"));
      const kind = this.kindOf(manifest);
      const list = PACK_LISTS[kind];
      const folder = root || this.folderName(result.filename);
      const target = `${world.path}/${list.folder}/${folder}`;

      await bridge.removePath(target);
      await this.unpack(zip, root, target, bridge);
      await this.enlist(world, list, manifest, bridge);
      written.push(`${list.folder}/${folder}`);
    }

    return { world, packs: written };
  }

  /** Folder prefixes that hold a manifest - "" when the pack is the archive. */
  private packRoots(zip: JSZip): string[] {
    const roots = new Set<string>();
    zip.forEach(path => {
      if (!path.endsWith("manifest.json")) return;
      const parts = path.split("/");
      if (parts.length === 1) roots.add("");
      else if (parts.length === 2) roots.add(parts[0]);
    });
    return [...roots];
  }

  private kindOf(manifest: { modules?: Array<{ type?: string }> }): "resources" | "data" {
    const types = (manifest.modules ?? []).map(module => module.type);
    return types.includes("resources") ? "resources" : "data";
  }

  private folderName(filename: string): string {
    return filename.replace(/\.[^.]+$/, "");
  }

  private async text(zip: JSZip, path: string): Promise<string> {
    const file = zip.file(path);
    if (!file) throw new Error(`Missing ${path} in the built pack.`);
    return await file.async("string");
  }

  private async unpack(
    zip: JSZip,
    root: string,
    target: string,
    bridge: ReturnType<PlatformService["getBridge"]>
  ): Promise<void> {
    const prefix = root ? `${root}/` : "";
    const files: JSZip.JSZipObject[] = [];
    zip.forEach((path, file) => {
      if (file.dir || !path.startsWith(prefix)) return;
      // A .mcpack has no prefix, so the other pack's files would come along.
      if (!root && path.split("/").length > 1 && path.includes("_RP/")) return;
      files.push(file);
    });

    for (const file of files) {
      const relative = file.name.slice(prefix.length);
      await bridge.writePath(`${target}/${relative}`, await file.async("uint8array"));
    }
  }

  /** Points the world's pack list at this pack, or updates the version it has. */
  private async enlist(
    world: MinecraftWorld,
    list: PackList,
    manifest: { header: { uuid: string; version: [number, number, number] } },
    bridge: ReturnType<PlatformService["getBridge"]>
  ): Promise<void> {
    const path = `${world.path}/${list.file}`;
    const current = await bridge.readPath(path);

    let entries: PackEntry[] = [];
    if (current) {
      try {
        const parsed: unknown = JSON.parse(current);
        if (Array.isArray(parsed)) entries = parsed as PackEntry[];
      } catch {
        // A broken list is replaced rather than kept: the world would not load
        // the packs it names anyway.
      }
    }

    const entry: PackEntry = { pack_id: manifest.header.uuid, version: manifest.header.version };
    const existing = entries.findIndex(item => item.pack_id === entry.pack_id);
    if (existing >= 0) entries[existing] = entry;
    else entries.unshift(entry);

    await bridge.writePath(path, JSON.stringify(entries, null, 4));
  }
}
