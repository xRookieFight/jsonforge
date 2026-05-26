import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { DiscordRpcManager, DiscordActivityState } from "./DiscordRpcManager";
import { AutoUpdaterManager } from "./AutoUpdaterManager";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

class PendingOpenQueue {
  private path: string | null = null;
  private listeners = new Set<(path: string) => void>();

  public enqueue(path: string): void {
    this.path = path;
    for (const listener of this.listeners) listener(path);
  }

  public consume(): string | null {
    const next = this.path;
    this.path = null;
    return next;
  }

  public subscribe(listener: (path: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class WindowManager {
  private window: BrowserWindow | null = null;
  private readonly pending: PendingOpenQueue;

  public constructor(pending: PendingOpenQueue) {
    this.pending = pending;
  }

  public create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1024,
      minHeight: 700,
      backgroundColor: "#1b1b1f",
      autoHideMenuBar: true,
      title: "JsonForge",
      icon: this.iconPath(),
      webPreferences: {
        preload: join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(process.env.VITE_DEV_SERVER_URL);
      this.window.webContents.openDevTools({ mode: "detach" });
    } else {
      this.window.loadFile(join(__dirname, "..", "dist", "index.html"));
    }

    this.window.webContents.on("did-finish-load", () => {
      const path = this.pending.consume();
      if (path) this.window?.webContents.send("file:openRequested", path);
    });

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    this.window.on("closed", () => {
      this.window = null;
    });

    return this.window;
  }

  public get(): BrowserWindow | null {
    return this.window;
  }

  public focus(): void {
    if (!this.window) return;
    if (this.window.isMinimized()) this.window.restore();
    this.window.focus();
  }

  private iconPath(): string | undefined {
    if (process.platform === "win32") return join(process.resourcesPath ?? __dirname, "icons", "icon.ico");
    if (process.platform === "darwin") return join(process.resourcesPath ?? __dirname, "icons", "icon.icns");
    return join(process.resourcesPath ?? __dirname, "icons", "icon.png");
  }
}

class FileBridge {
  public register(): void {
    ipcMain.handle("fs:readFile", async (_e, path: string, encoding?: BufferEncoding) => {
      return await readFile(path, encoding ?? "utf-8");
    });
    ipcMain.handle("fs:writeFile", async (_e, path: string, data: string) => {
      await writeFile(path, data, "utf-8");
    });
    ipcMain.handle("fs:mkdir", async (_e, path: string) => {
      await mkdir(path, { recursive: true });
    });
    ipcMain.handle("fs:readdir", async (_e, path: string) => {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));
    });
    ipcMain.handle("fs:stat", async (_e, path: string) => {
      const s = await stat(path);
      return { size: s.size, mtimeMs: s.mtimeMs, isDir: s.isDirectory() };
    });
  }
}

class DialogBridge {
  public register(window: () => BrowserWindow | null): void {
    ipcMain.handle("dialog:openFile", async (_e, filters?: Electron.FileFilter[]) => {
      const win = window();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: filters ?? [{ name: "All", extensions: ["*"] }]
      });
      return result.canceled ? null : result.filePaths[0];
    });
    ipcMain.handle("dialog:openDirectory", async () => {
      const win = window();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
      return result.canceled ? null : result.filePaths[0];
    });
    ipcMain.handle("dialog:saveFile", async (_e, defaultPath?: string, filters?: Electron.FileFilter[]) => {
      const win = window();
      if (!win) return null;
      const result = await dialog.showSaveDialog(win, {
        defaultPath,
        filters: filters ?? [{ name: "JSON", extensions: ["json"] }]
      });
      return result.canceled ? null : result.filePath;
    });
  }
}

class AppMenu {
  public build(window: BrowserWindow): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "File",
        submenu: [
          { label: "New Project", accelerator: "CmdOrCtrl+N", click: () => window.webContents.send("menu:newProject") },
          { label: "Open .jfproject...", accelerator: "CmdOrCtrl+O", click: () => window.webContents.send("menu:openProject") },
          { label: "Save .jfproject", accelerator: "CmdOrCtrl+S", click: () => window.webContents.send("menu:save") },
          { label: "Save As...", accelerator: "CmdOrCtrl+Shift+S", click: () => window.webContents.send("menu:saveAs") },
          { type: "separator" },
          { label: "Import JSON UI...", click: () => window.webContents.send("menu:importJsonUi") },
          { label: "Export JSON UI...", click: () => window.webContents.send("menu:exportJsonUi") },
          { type: "separator" },
          { role: "quit" }
        ]
      },
      {
        label: "Edit",
        submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => window.webContents.send("menu:undo") },
          { label: "Redo", accelerator: "CmdOrCtrl+Shift+Z", click: () => window.webContents.send("menu:redo") },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "delete" },
          { type: "separator" },
          { label: "Settings", accelerator: "CmdOrCtrl+,", click: () => window.webContents.send("menu:settings") }
        ]
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      {
        label: "Help",
        submenu: [
          { label: "About JsonForge", click: () => window.webContents.send("menu:about") }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

function parseProjectArg(argv: string[]): string | null {
  for (const arg of argv) {
    if (extname(arg).toLowerCase() === ".jfproject") return arg;
  }
  return null;
}

class DiscordBridge {
  public constructor(private readonly rpc: DiscordRpcManager) {}

  public register(): void {
    ipcMain.handle("discord:setActivity", (_e, activity: DiscordActivityState) => {
      this.rpc.setActivity(activity);
    });
    ipcMain.handle("discord:setIdle", () => {
      this.rpc.setIdle();
    });
  }
}

class JsonForgeApp {
  private readonly pending = new PendingOpenQueue();
  private readonly windowManager = new WindowManager(this.pending);
  private readonly fileBridge = new FileBridge();
  private readonly dialogBridge = new DialogBridge();
  private readonly appMenu = new AppMenu();
  private readonly discordRpc = new DiscordRpcManager();
  private readonly discordBridge = new DiscordBridge(this.discordRpc);
  private readonly updater = new AutoUpdaterManager();

  public bootstrap(): void {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on("second-instance", (_event, argv) => {
      const path = parseProjectArg(argv);
      if (path) this.pending.enqueue(path);
      this.windowManager.focus();
      const window = this.windowManager.get();
      if (window) window.webContents.send("file:openRequested", path);
    });

    app.on("open-file", (event, path) => {
      event.preventDefault();
      this.pending.enqueue(path);
      const window = this.windowManager.get();
      if (window) window.webContents.send("file:openRequested", path);
    });

    app.whenReady().then(() => {
      const fromArgv = parseProjectArg(process.argv.slice(1));
      if (fromArgv) this.pending.enqueue(fromArgv);

      this.fileBridge.register();
      this.dialogBridge.register(() => this.windowManager.get());
      this.discordBridge.register();
      ipcMain.handle("file:consumeOpenRequest", () => this.pending.consume());

      const window = this.windowManager.create();
      this.appMenu.build(window);
      void this.discordRpc.connect();
      void this.updater.start(() => this.windowManager.get());
    });

    app.on("window-all-closed", () => {
      this.discordRpc.destroy();
      if (process.platform !== "darwin") app.quit();
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const window = this.windowManager.create();
        this.appMenu.build(window);
      }
    });
  }
}

new JsonForgeApp().bootstrap();
