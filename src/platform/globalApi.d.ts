interface JsonForgeApi {
  platform: "electron";
  fs: {
    readFile(path: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    readdir(path: string): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean }>>;
    stat(path: string): Promise<{ size: number; mtimeMs: number; isDir: boolean }>;
  };
  dialog: {
    openFile(filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null>;
    openDirectory(): Promise<string | null>;
    saveFile(defaultPath?: string, filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null>;
  };
  file: {
    consumeOpenRequest(): Promise<string | null>;
    onOpenRequest(handler: (path: string) => void): () => void;
  };
  menu: {
    on(channel: string, handler: () => void): () => void;
  };
}

interface Window {
  jsonforge?: JsonForgeApi;
}
