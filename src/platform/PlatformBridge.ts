export interface PlatformBridge {
  readonly id: "web" | "electron";

  readFile(handle: FileHandle): Promise<string>;
  writeFile(handle: FileHandle, data: string): Promise<void>;
  writeBinaryFile(handle: FileHandle, data: Uint8Array): Promise<void>;
  openFilePicker(filters?: FileFilter[]): Promise<FileHandle | null>;
  openDirectoryPicker(): Promise<DirectoryHandle | null>;
  saveFilePicker(suggestedName?: string, filters?: FileFilter[]): Promise<FileHandle | null>;

  onMenu(channel: MenuChannel, handler: () => void): () => void;
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
