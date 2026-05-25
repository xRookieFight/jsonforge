import { Service, ServicePriority } from "../base/Service";
import { PlatformBridge } from "../../platform/PlatformBridge";
import { PlatformDetector } from "../../platform/PlatformDetector";

export class PlatformService extends Service {
  public static readonly NAME = "PlatformService";
  private bridge: PlatformBridge | null = null;

  public getName(): string {
    return PlatformService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.PLATFORM;
  }

  public async onLoad(): Promise<void> {
    this.bridge = PlatformDetector.detect();
  }

  public getBridge(): PlatformBridge {
    if (!this.bridge) throw new Error("PlatformService not loaded.");
    return this.bridge;
  }

  public isElectron(): boolean {
    return this.bridge?.id === "electron";
  }
}
