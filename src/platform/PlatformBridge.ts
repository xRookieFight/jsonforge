export interface PlatformBridge {
  readonly id: "web" | "electron";

  readFile(handle: FileHandle): Promise<string>;
  writeFile(handle: FileHandle, data: string): Promise<void>;
  writeBinaryFile(handle: FileHandle, data: Uint8Array): Promise<void>;
  openFilePicker(filters?: FileFilter[]): Promise<FileHandle | null>;
  openDirectoryPicker(): Promise<DirectoryHandle | null>;
  saveFilePicker(suggestedName?: string, filters?: FileFilter[]): Promise<FileHandle | null>;

  onMenu(channel: MenuChannel, handler: () => void): () => void;

  /**
   * Minecraft worlds found on this machine, empty where there is no local
   * Minecraft to look at - the browser build, mainly.
   */
  listWorlds(): Promise<MinecraftWorld[]>;
  /** Writes a file anywhere on disk, creating the folders it needs. */
  writePath(path: string, data: Uint8Array | string): Promise<void>;
  /** Deletes a file or a whole folder. */
  removePath(path: string): Promise<void>;
  /** Reads a file by path, or null when it is not there. */
  readPath(path: string): Promise<string | null>;
}

export interface MinecraftWorld {
  /** Absolute path of the world folder. */
  path: string;
  /** Name the player gave the world. */
  name: string;
  /** Name of the folder itself, which is what makes two worlds tellable apart. */
  folder: string;
}

export type MenuChannel =
  | "menu:newProject"
  | "menu:openProject"
  | "menu:save"
  | "menu:saveAs"
  | "menu:importJsonUi"
  | "menu:exportJsonUi"
  | "menu:undo"
  | "menu:redo"
  | "menu:settings"
  | "menu:about";

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileHandle {
  kind: "file";
  name: string;
  path?: string;
  webHandle?: unknown;
}

export interface DirectoryHandle {
  kind: "directory";
  name: string;
  path?: string;
  webHandle?: unknown;
}
