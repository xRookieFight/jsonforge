/**
 * Registers the textures used by the screens and maps them onto paths inside
 * the pack.
 *
 * Vanilla textures keep their own path: the game already ships them, and
 * copying them would only bloat the pack. Everything else - presets and user
 * uploads - is written into `textures/ui/<pack>/`.
 */
import { Container } from "../di/Container";
import { TextureMeta, TextureService } from "../services/TextureService";

export interface CollectedTexture {
  meta: TextureMeta;
  /** Path inside the pack, without extension. */
  packPath: string;
}

export class TextureCollector {
  private readonly packNamespace: string;
  private readonly byName = new Map<string, CollectedTexture>();
  private readonly usedNames = new Set<string>();
  private readonly missing = new Set<string>();

  public constructor(packNamespace: string) {
    this.packNamespace = packNamespace;
  }

  /** Resolver handed to the serializer and to the script generator. */
  public readonly resolve = (name: string): string => {
    if (!name) return "textures/ui/White";

    const known = this.byName.get(name);
    if (known) return known.packPath;

    const service = Container.resolve<TextureService>(TextureService.NAME);
    const meta = service.findByName(name);
    if (!meta || meta.source === "vanilla") {
      // Either a vanilla texture or a path typed by hand: keep it as written.
      if (!meta) this.missing.add(name);
      return name;
    }

    const packPath = `textures/ui/${this.packNamespace}/${this.uniqueFileName(meta.name)}`;
    this.byName.set(name, { meta, packPath });
    return packPath;
  };

  public all(): CollectedTexture[] {
    return [...this.byName.values()];
  }

  /** Texture names that no entry of the library could explain. */
  public unresolved(): string[] {
    return [...this.missing];
  }

  private uniqueFileName(name: string): string {
    const base =
      name
        .substring(name.lastIndexOf("/") + 1)
        .replace(/\.png$/i, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "texture";

    let unique = base;
    let n = 2;
    while (this.usedNames.has(unique)) unique = `${base}_${n++}`;
    this.usedNames.add(unique);
    return unique;
  }
}
