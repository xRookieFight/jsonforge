import { Service, ServicePriority } from "../base/Service";
import { Container } from "../di/Container";
import { PlatformService } from "./PlatformService";
import { FileFilter, FileHandle } from "../../platform/PlatformBridge";

export class FileService extends Service {
  public static readonly NAME = "FileService";

  public getName(): string {
    return FileService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.EXPORT;
  }

  public async openFile(filters?: FileFilter[]): Promise<{ handle: FileHandle; content: string } | null> {
    const bridge = Container.resolve<PlatformService>(PlatformService.NAME).getBridge();
    const handle = await bridge.openFilePicker(filters);
    if (!handle) return null;
    const content = await bridge.readFile(handle);
    return { handle, content };
  }

  public async saveFile(content: string, suggestedName?: string, filters?: FileFilter[]): Promise<FileHandle | null> {
    const bridge = Container.resolve<PlatformService>(PlatformService.NAME).getBridge();
    const handle = await bridge.saveFilePicker(suggestedName, filters);
    if (!handle) return null;
    await bridge.writeFile(handle, content);
    return handle;
  }

  public async writeTo(handle: FileHandle, content: string): Promise<void> {
    const bridge = Container.resolve<PlatformService>(PlatformService.NAME).getBridge();
    await bridge.writeFile(handle, content);
  }
}
