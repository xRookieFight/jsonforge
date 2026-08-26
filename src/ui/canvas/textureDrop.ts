import { ElementNode } from "../../core/element/ElementNode";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";
import { PropertyValue } from "../../core/property/base/PropertyType";

export const TEXTURE_MIME = "application/jsonforge-texture";

/** Property a dropped texture lands on, per element type. */
export const TEXTURE_SLOTS: Record<string, string | undefined> = {
  image: "texture",
  panel: "texture",
  button: "default_texture"
};

export type PropertyEntry = {
  elementId: string;
  key: string;
  prev: PropertyValue;
  next: PropertyValue;
};

/** Resolves a texture reference against the library, by id or by name. */
export function findTexture(list: TextureMeta[], query: string): TextureMeta | null {
  if (!query) return null;
  const lower = query.toLowerCase();
  const base = lower.split("/").pop() ?? lower;
  const stem = base.replace(/\.[^.]+$/, "");
  for (const tex of list) {
    if (tex.id === query || tex.name === query) return tex;
  }
  for (const tex of list) {
    const texName = tex.name.toLowerCase();
    const texStem = texName.replace(/\.[^.]+$/, "");
    if (texName === base || texStem === stem) return tex;
    if (texStem === lower || texName === lower) return tex;
  }
  return null;
}

/**
 * Applies a dropped texture and, when the art carries nine-slice data, the
 * borders that go with it - both in a single undo step.
 */
export function applyTexture(
  node: ElementNode,
  key: string,
  name: string,
  setLive: (id: string, key: string, value: PropertyValue) => void,
  commit: (entries: PropertyEntry[], label?: string) => void
): void {
  const service = Container.resolve<TextureService>(TextureService.NAME);
  const meta = findTexture(service.list(), name);
  const entries: PropertyEntry[] = [
    { elementId: node.id, key, prev: node.properties[key], next: name }
  ];

  const slice = meta?.nineSlice;
  if (slice && slice.some(v => v !== 0) && "nineslice_size" in node.properties) {
    entries.push({
      elementId: node.id,
      key: "nineslice_size",
      prev: node.properties["nineslice_size"],
      next: slice
    });
  }

  for (const entry of entries) setLive(entry.elementId, entry.key, entry.next);
  commit(entries, "Set texture");
}
