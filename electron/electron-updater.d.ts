declare module "electron-updater" {
  export interface UpdateInfo {
    version: string;
    releaseName?: string;
    releaseNotes?: string | Array<{ version: string; note: string | null }>;
    releaseDate: string;
  }

  export interface ProgressInfo {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  }

  export interface AppUpdater {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    allowPrerelease: boolean;
    logger: unknown;
    checkForUpdates(): Promise<unknown>;
    downloadUpdate(): Promise<unknown>;
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "update-available" | "update-downloaded", listener: (info: UpdateInfo) => void): this;
    on(event: "update-not-available", listener: (info: UpdateInfo) => void): this;
    on(event: "download-progress", listener: (progress: ProgressInfo) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export const autoUpdater: AppUpdater;
}
