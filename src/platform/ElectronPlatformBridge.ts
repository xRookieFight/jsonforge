import { DirectoryHandle, FileFilter, FileHandle, MenuChannel, PlatformBridge } from "./PlatformBridge";

export class ElectronPlatformBridge implements PlatformBridge {
  public readonly id = "electron" as const;

  private api(): JsonForgeApi {
    const api = window.jsonforge;
    if (!api) throw new Error("Electron bridge not exposed.");
    return api;
  }

  public async readFile(handle: FileHandle): Promise<string> {
    if (!handle.path) throw new Error("Electron bridge requires a path.");
    return await this.api().fs.readFile(handle.path, "utf-8");
  }

  public async writeFile(handle: FileHandle, data: string): Promise<void> {
    if (!handle.path) throw new Error("Electron bridge requires a path.");
    await this.api().fs.writeFile(handle.path, data);
  }

  public async writeBinaryFile(handle: FileHandle, data: Uint8Array): Promise<void> {
    if (!handle.path) throw new Error("Electron bridge requires a path.");
    await this.api().fs.writeBinaryFile(handle.path, data);
  }

  public async openFilePicker(filters?: FileFilter[]): Promise<FileHandle | null> {
    const path = await this.api().dialog.openFile(filters);
    if (!path) return null;
    return { kind: "file", name: path.split(/[\\/]/).pop() ?? path, path };
  }

  public async openDirectoryPicker(): Promise<DirectoryHandle | null> {
    const path = await this.api().dialog.openDirectory();
    if (!path) return null;
    return { kind: "directory", name: path.split(/[\\/]/).pop() ?? path, path };
  }

  public async saveFilePicker(suggestedName?: string, filters?: FileFilter[]): Promise<FileHandle | null> {
    const path = await this.api().dialog.saveFile(suggestedName, filters);
    if (!path) return null;
    return { kind: "file", name: path.split(/[\\/]/).pop() ?? path, path };
  }

  public onMenu(channel: MenuChannel, handler: () => void): () => void {
    return this.api().menu.on(channel, handler);
  }
}
