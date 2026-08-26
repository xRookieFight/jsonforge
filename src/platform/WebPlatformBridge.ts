import { DirectoryHandle, FileFilter, FileHandle, MenuChannel, PlatformBridge } from "./PlatformBridge";

interface FileSystemWritableFileStreamLike {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

interface FileSystemDirectoryHandleLike {
  name: string;
}

interface ShowOpenFilePickerOptions {
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  multiple?: boolean;
}

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}

interface WindowWithFsApi extends Window {
  showOpenFilePicker?: (opts?: ShowOpenFilePickerOptions) => Promise<FileSystemFileHandleLike[]>;
  showSaveFilePicker?: (opts?: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandleLike>;
}

export class WebPlatformBridge implements PlatformBridge {
  public readonly id = "web" as const;

  public async readFile(handle: FileHandle): Promise<string> {
    const fileHandle = handle.webHandle as FileSystemFileHandleLike | undefined;
    if (fileHandle) {
      const file = await fileHandle.getFile();
      return await file.text();
    }
    throw new Error("Web bridge requires a webHandle to read.");
  }

  public async writeFile(handle: FileHandle, data: string): Promise<void> {
    const fileHandle = handle.webHandle as FileSystemFileHandleLike | undefined;
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return;
    }
    // Firefox has no File System Access API: hand the file to the downloader.
    this.download(new Blob([data], { type: "application/json" }), handle.name);
  }

  public async writeBinaryFile(handle: FileHandle, data: Uint8Array): Promise<void> {
    const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: "application/octet-stream" });
    const fileHandle = handle.webHandle as FileSystemFileHandleLike | undefined;
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
    // No file system access: fall back to a plain browser download.
    this.download(blob, handle.name);
  }

  /**
   * Saves a blob through a temporary link. The anchor has to sit in the
   * document and the URL has to outlive the click, or Firefox drops the file.
   */
  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 5000);
  }

  public async openFilePicker(filters?: FileFilter[]): Promise<FileHandle | null> {
    const win = window as WindowWithFsApi;
    if (win.showOpenFilePicker) {
      try {
        const [picked] = await win.showOpenFilePicker({
          types: filters?.map(f => ({
            description: f.name,
            accept: { "application/json": f.extensions.map(e => "." + e) }
          }))
        });
        return { kind: "file", name: picked.name, webHandle: picked };
      } catch {
        return null;
      }
    }
    return await this.fallbackOpen(filters);
  }

  public async saveFilePicker(suggestedName?: string, filters?: FileFilter[]): Promise<FileHandle | null> {
    const win = window as WindowWithFsApi;
    if (win.showSaveFilePicker) {
      try {
        const picked = await win.showSaveFilePicker({
          suggestedName,
          types: filters?.map(f => ({
            description: f.name,
            accept: { "application/octet-stream": f.extensions.map(e => "." + e) }
          }))
        });
        return { kind: "file", name: picked.name, webHandle: picked };
      } catch {
        return null;
      }
    }
    return { kind: "file", name: suggestedName ?? "project.json" };
  }

  public async openDirectoryPicker(): Promise<DirectoryHandle | null> {
    const win = window as WindowWithFsApi;
    if (win.showDirectoryPicker) {
      try {
        const picked = await win.showDirectoryPicker();
        return { kind: "directory", name: picked.name, webHandle: picked };
      } catch {
        return null;
      }
    }
    return null;
  }

  public onMenu(_channel: MenuChannel, _handler: () => void): () => void {
    return () => {};
  }

  private async fallbackOpen(filters?: FileFilter[]): Promise<FileHandle | null> {
    return await new Promise(resolve => {
      const input = document.createElement("input");
      input.type = "file";
      if (filters && filters.length > 0) {
        input.accept = filters
          .flatMap(f => f.extensions.map(e => "." + e))
          .join(",");
      }
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const text = await file.text();
        resolve({
          kind: "file",
          name: file.name,
          webHandle: {
            name: file.name,
            getFile: async () => file,
            createWritable: async (): Promise<FileSystemWritableFileStreamLike> => {
              let buffer: string | Blob = "";
              return {
                write: async (data: string | Blob) => {
                  buffer = data;
                },
                close: async () => {
                  const blob = new Blob([buffer], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = file.name;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              };
            }
          } as FileSystemFileHandleLike
        });
        void text;
      };
      input.click();
    });
  }
}
