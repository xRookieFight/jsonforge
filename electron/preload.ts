import { contextBridge, ipcRenderer } from "electron";

const bridge = {
  platform: "electron" as const,

  fs: {
    readFile: (path: string, encoding?: BufferEncoding): Promise<string> =>
      ipcRenderer.invoke("fs:readFile", path, encoding),
    writeFile: (path: string, data: string): Promise<void> =>
      ipcRenderer.invoke("fs:writeFile", path, data),
    mkdir: (path: string): Promise<void> => ipcRenderer.invoke("fs:mkdir", path),
    readdir: (path: string): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean }>> =>
      ipcRenderer.invoke("fs:readdir", path),
    stat: (path: string): Promise<{ size: number; mtimeMs: number; isDir: boolean }> =>
      ipcRenderer.invoke("fs:stat", path)
  },

  dialog: {
    openFile: (filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> =>
      ipcRenderer.invoke("dialog:openFile", filters),
    openDirectory: (): Promise<string | null> => ipcRenderer.invoke("dialog:openDirectory"),
    saveFile: (defaultPath?: string, filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> =>
      ipcRenderer.invoke("dialog:saveFile", defaultPath, filters)
  },

  file: {
    consumeOpenRequest: (): Promise<string | null> => ipcRenderer.invoke("file:consumeOpenRequest"),
    onOpenRequest(handler: (path: string) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, path: string | null) => {
        if (path) handler(path);
      };
      ipcRenderer.on("file:openRequested", listener);
      return () => ipcRenderer.removeListener("file:openRequested", listener);
    }
  },

  menu: {
    on: (channel: string, handler: () => void): (() => void) => {
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
};

contextBridge.exposeInMainWorld("jsonforge", bridge);
