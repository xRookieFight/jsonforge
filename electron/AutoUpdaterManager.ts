import { app, dialog, BrowserWindow } from "electron";

export class AutoUpdaterManager {
  private started = false;

  public async start(getWindow: () => BrowserWindow | null): Promise<void> {
    if (this.started) return;
    if (!app.isPackaged) return;
    this.started = true;

    let autoUpdater: import("electron-updater").AppUpdater;
    try {
      const mod = await import("electron-updater");
      autoUpdater = mod.autoUpdater;
    } catch (err) {
      console.warn("[updater] electron-updater not installed:", err);
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = null;

    autoUpdater.on("error", (err: Error) => {
      console.warn("[updater] error:", err.message);
    });

    autoUpdater.on("update-available", async info => {
      const window = getWindow();
      const result = await dialog.showMessageBox(window ?? undefined!, {
        type: "info",
        buttons: ["Update Now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Available",
        message: `JsonForge ${info.version} is available.`,
        detail: `You are running ${app.getVersion()}. Download and install the new version now?`
      });
      if (result.response === 0) {
        try {
          await autoUpdater.downloadUpdate();
        } catch (err) {
          console.warn("[updater] download failed:", err);
          dialog.showMessageBox(window ?? undefined!, {
            type: "error",
            title: "Update Failed",
            message: "Failed to download the update.",
            detail: String(err)
          });
        }
      }
    });

    autoUpdater.on("update-not-available", () => {
      /* silent on no-update at startup */
    });

    autoUpdater.on("download-progress", progress => {
      const window = getWindow();
      window?.setProgressBar(progress.percent / 100);
    });

    autoUpdater.on("update-downloaded", async info => {
      const window = getWindow();
      window?.setProgressBar(-1);
      const result = await dialog.showMessageBox(window ?? undefined!, {
        type: "info",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Ready",
        message: `JsonForge ${info.version} has been downloaded.`,
        detail: "Restart the app to apply the update. Unsaved work will be lost."
      });
      if (result.response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall(false, true));
      }
    });

    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn("[updater] check failed:", err);
    }
  }
}
