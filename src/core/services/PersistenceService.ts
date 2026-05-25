import { Service, ServicePriority } from "../base/Service";

interface DBSchema {
  projects: { id: string; name: string; updatedAt: number; data: unknown };
  settings: { key: string; value: unknown };
  textures: { id: string; name: string; mime: string; blob: Blob };
}

export class PersistenceService extends Service {
  public static readonly NAME = "PersistenceService";
  private static readonly DB_NAME = "jsonforge";
  private static readonly DB_VERSION = 1;

  private db: IDBDatabase | null = null;

  public getName(): string {
    return PersistenceService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.PERSISTENCE;
  }

  public async onLoad(): Promise<void> {
    this.db = await this.open();
  }

  public async putProject(id: string, name: string, data: unknown): Promise<void> {
    await this.put("projects", { id, name, data, updatedAt: Date.now() });
  }

  public async getProject(id: string): Promise<DBSchema["projects"] | null> {
    return await this.get<DBSchema["projects"]>("projects", id);
  }

  public async listProjects(): Promise<DBSchema["projects"][]> {
    return await this.all<DBSchema["projects"]>("projects");
  }

  public async deleteProject(id: string): Promise<void> {
    await this.del("projects", id);
  }

  public async putSetting(key: string, value: unknown): Promise<void> {
    await this.put("settings", { key, value });
  }

  public async getSetting<T>(key: string): Promise<T | null> {
    const row = await this.get<{ key: string; value: T }>("settings", key);
    return row?.value ?? null;
  }

  public async putTexture(id: string, name: string, mime: string, blob: Blob): Promise<void> {
    await this.put("textures", { id, name, mime, blob });
  }

  public async getTexture(id: string): Promise<DBSchema["textures"] | null> {
    return await this.get<DBSchema["textures"]>("textures", id);
  }

  public async listTextures(): Promise<DBSchema["textures"][]> {
    return await this.all<DBSchema["textures"]>("textures");
  }

  public async deleteTexture(id: string): Promise<void> {
    await this.del("textures", id);
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(PersistenceService.DB_NAME, PersistenceService.DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("textures")) {
          db.createObjectStore("textures", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private store(name: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("PersistenceService not loaded.");
    return this.db.transaction(name, mode).objectStore(name);
  }

  private put(name: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.store(name, "readwrite").put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private get<T>(name: string, key: IDBValidKey): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const req = this.store(name, "readonly").get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private all<T>(name: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const req = this.store(name, "readonly").getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private del(name: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.store(name, "readwrite").delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
