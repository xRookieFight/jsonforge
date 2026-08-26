import "./styles/theme.css";
import "./styles/global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Container } from "./core/di/Container";
import { ElementBootstrap } from "./core/element/ElementBootstrap";
import { PlatformService } from "./core/services/PlatformService";
import { PersistenceService } from "./core/services/PersistenceService";
import { ProjectService } from "./core/services/ProjectService";
import { SelectionService } from "./core/services/SelectionService";
import { HistoryService } from "./core/services/HistoryService";
import { TextureService } from "./core/services/TextureService";
import { BindingService } from "./core/services/BindingService";
import { PresetService } from "./core/services/PresetService";
import { KeyboardService } from "./core/services/KeyboardService";
import { FileService } from "./core/services/FileService";
import { AutoSaveService } from "./core/services/AutoSaveService";
import { AddonExportService } from "./core/services/AddonExportService";

async function bootstrap(): Promise<void> {
  ElementBootstrap.registerDefaults();
  await Container.boot([
    new PlatformService(),
    new PersistenceService(),
    new ProjectService(),
    new SelectionService(),
    new HistoryService(),
    new TextureService(),
    new BindingService(),
    new PresetService(),
    new KeyboardService(),
    new FileService(),
    new AutoSaveService(),
    new AddonExportService()
  ]);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap().catch(err => {
  document.body.innerHTML = `<pre style="color:#f88;padding:24px;font-family:monospace;">${String(err?.stack ?? err)}</pre>`;
});
