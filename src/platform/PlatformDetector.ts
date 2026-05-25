import { ElectronPlatformBridge } from "./ElectronPlatformBridge";
import { PlatformBridge } from "./PlatformBridge";
import { WebPlatformBridge } from "./WebPlatformBridge";

export class PlatformDetector {
  public static detect(): PlatformBridge {
    if (typeof window !== "undefined" && window.jsonforge?.platform === "electron") {
      return new ElectronPlatformBridge();
    }
    return new WebPlatformBridge();
  }
}
