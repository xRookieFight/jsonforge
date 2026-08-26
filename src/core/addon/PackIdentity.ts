/**
 * Persistent identity of a generated pack.
 *
 * The UUIDs must stay STABLE across exports: if they change, Minecraft treats
 * every download as a different pack and the world list fills with copies. They
 * are stored per pack namespace and only the patch version is bumped, so the
 * game recognises an update of the SAME pack.
 */
const IDENTITY_KEY = "jsonforge_pack_identity";

export interface PackIdentity {
  rpHeader: string;
  rpModule: string;
  bpHeader: string;
  bpModule: string;
  version: [number, number, number];
}

function loadAll(): Record<string, PackIdentity> {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "{}") as Record<string, PackIdentity>;
  } catch {
    return {};
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
    const rand = (Math.random() * 16) | 0;
    const value = ch === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Returns the identity of a pack, creating it once and bumping the patch. */
export function nextPackIdentity(packNamespace: string): PackIdentity {
  const all = loadAll();
  const current = all[packNamespace];

  const identity: PackIdentity = current
    ? { ...current, version: [current.version[0], current.version[1], current.version[2] + 1] }
    : {
        rpHeader: uuid(),
        rpModule: uuid(),
        bpHeader: uuid(),
        bpModule: uuid(),
        version: [1, 0, 0]
      };

  all[packNamespace] = identity;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(all));
  } catch {
    // Without storage the pack still builds, it only loses UUID stability.
  }
  return identity;
}
