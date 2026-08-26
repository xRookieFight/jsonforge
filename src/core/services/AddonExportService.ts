import { Service, ServicePriority } from "../base/Service";
import { Container } from "../di/Container";
import { ProjectService } from "./ProjectService";
import { FileService } from "./FileService";
import { AddonPackBuilder } from "../addon/AddonPackBuilder";
import { AddonBuildResult, AddonScreen, ScriptApi, toNamespace } from "../addon/AddonTypes";

export interface AddonExportSettings {
  packName: string;
  screenName: string;
  triggerItem: string;
  scriptApi: ScriptApi;
  /** Layout scaling of the exported screen. */
  scaleMode: "fit" | "absolute";
  /** Objective shown on the vanilla sidebar; empty leaves the sidebar alone. */
  sidebarObjective: string;
  /** Form screen opened by the script, or an always-on HUD overlay. */
  screenTarget: "form" | "hud" | "scoreboard";
  /** Scoreboard target: keep the objective name the game draws. */
  showObjectiveTitle: boolean;
  /** Scoreboard target: keep the name/score rows the game draws. */
  showScoreRows: boolean;
}

/** Builds and saves the pack of the current project (.mcaddon or .mcpack). */
export class AddonExportService extends Service {
  public static readonly NAME = "AddonExportService";

  private readonly builder = new AddonPackBuilder();

  public getName(): string {
    return AddonExportService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.EXPORT;
  }

  public defaults(): AddonExportSettings {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const name = project.hasProject() ? project.getMeta().name : "JsonForge Pack";
    return {
      packName: name,
      screenName: name,
      triggerItem: "minecraft:stick",
      scriptApi: "1.x",
      scaleMode: "fit",
      sidebarObjective: "",
      screenTarget: "form",
      showObjectiveTitle: true,
      showScoreRows: true
    };
  }

  public async build(settings: AddonExportSettings): Promise<AddonBuildResult> {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!project.hasProject()) throw new Error("No project loaded.");

    const screen: AddonScreen = {
      name: settings.screenName,
      namespace: project.getMeta().namespace || toNamespace(settings.screenName),
      root: project.getRoot()
    };

    return await this.builder.build({
      screens: [screen],
      packName: settings.packName,
      triggerItem: settings.triggerItem,
      scriptApi: settings.scriptApi,
      scaleMode: settings.scaleMode,
      sidebarObjective: settings.sidebarObjective.trim() || undefined,
      screenTarget: settings.screenTarget,
      showObjectiveTitle: settings.showObjectiveTitle,
      showScoreRows: settings.showScoreRows
    });
  }

  /** Builds the pack and asks the user where to write it. */
  public async exportToFile(settings: AddonExportSettings): Promise<AddonBuildResult> {
    const result = await this.build(settings);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const fileService = Container.resolve<FileService>(FileService.NAME);
    await fileService.saveBinaryFile(bytes, result.filename, [
      { name: "Minecraft Pack", extensions: [result.filename.split(".").pop() ?? "mcaddon"] }
    ]);
    return result;
  }
}
