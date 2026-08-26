import { ElementNode } from "../element/ElementNode";

/** Script module versions the generated behavior pack may target. */
export type ScriptApi = "1.x" | "2.x";

/**
 * One screen of the addon. Each screen becomes a JSON UI file inside the
 * resource pack and is opened in game by its name - the script sends it as the
 * form title and server_form.json routes on that title.
 */
export interface AddonScreen {
  name: string;
  namespace: string;
  root: ElementNode;
}

export interface AddonBuildOptions {
  screens: AddonScreen[];
  packName: string;
  /** "fit" scales the layout to the game screen, "absolute" keeps the units. */
  scaleMode?: "fit" | "absolute";
  /**
   * Where the screen shows up.
   *
   * "form" routes it through server_form, so it opens when the behavior pack
   * script shows a form - single player or your own world only, since servers
   * do not run your behavior pack. "hud" hangs the layout on the vanilla HUD
   * through ui/hud_screen.json. "scoreboard" replaces the vanilla sidebar
   * scoreboard in ui/scoreboards.json, keeping the engine bindings, so the
   * drawn board becomes the real scoreboard with live names and scores.
   */
  screenTarget?: "form" | "hud" | "scoreboard";
  /** Item that opens the first screen when used. */
  triggerItem: string;
  /** Objective the script puts on the vanilla sidebar, if any. */
  sidebarObjective?: string;
  /** Scoreboard target: draw the objective name the game supplies. */
  showObjectiveTitle?: boolean;
  /** Scoreboard target: draw the name/score rows the game supplies. */
  showScoreRows?: boolean;
  scriptApi: ScriptApi;
}

export interface AddonBuildResult {
  blob: Blob;
  filename: string;
  /** Paths written into the archive, for the export dialog. */
  files: string[];
  /** Non fatal problems (missing texture, empty screen...). */
  warnings: string[];
}

/** Turns a display name into a valid JSON UI namespace. */
export function toNamespace(name: string): string {
  const ns = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ns || "custom_ui";
}

/**
 * Cleans a screen name for use inside a binding expression - a quote would
 * close the source_property_name string.
 */
export function sanitizeFlag(name: string): string {
  return name.replace(/['"\\]/g, "").trim();
}
