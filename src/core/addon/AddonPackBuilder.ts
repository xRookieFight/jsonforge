/**
 * Builds the .mcaddon out of the editor screens.
 *
 * Two packs go inside a single archive:
 *   <pack>_RP/  resource pack  - the JSON UI, the server_form router, textures
 *   <pack>_BP/  behavior pack  - the script that opens the screens
 *
 * Rules honoured here:
 *   - manifest.json at the root of each pack, with different UUIDs
 *   - ui/_ui_defs.json listing the NEW files; server_form.json stays out
 *     because it carries the name of a vanilla screen
 *   - every shipped texture paired with its nine-slice .json, whose base_size
 *     is the logical size the borders refer to
 */
import JSZip from "jszip";
import { AddonBuildOptions, AddonBuildResult, ScriptApi, sanitizeFlag, toNamespace } from "./AddonTypes";
import { ScreenRoute, hudScreenTemplate, scoreboardsTemplate, serverFormTemplate, SidebarBox } from "./AddonTemplates";
import { ElementNode } from "../element/ElementNode";
import { ScreenSerializer } from "./ScreenSerializer";
import { TextureCollector } from "./TextureCollector";
import { generateScript } from "./ScriptGenerator";
import { nextPackIdentity, PackIdentity } from "./PackIdentity";
import { fetchBytes, readPngSize } from "./PngMeta";
import { Container } from "../di/Container";
import { TextureService } from "../services/TextureService";

/** API versions declared in the behavior pack manifest. */
const SCRIPT_API_VERSIONS: Record<ScriptApi, { server: string; ui: string }> = {
  "1.x": { server: "1.11.0", ui: "1.3.0" },
  "2.x": { server: "2.0.0", ui: "2.0.0" }
};

const MIN_ENGINE_VERSION = [1, 21, 0];

/** Marker names an element can carry to drive the scoreboard layout. */
const TITLE_MARKER = "scoreboard_title";
const ENTRIES_MARKER = "scoreboard_entries";

/** The drawn board: the single child of the screen root, or the root itself. */
function sidebarBody(root: ElementNode): ElementNode {
  return root.children.length === 1 ? root.children[0] : root;
}

function boxOf(node: ElementNode): SidebarBox {
  return {
    size: (node.properties["size"] as [number, number]) ?? [100, 40],
    offset: (node.properties["offset"] as [number, number]) ?? [0, 0],
    anchorFrom: (node.properties["anchor_from"] as string) ?? "top_left",
    anchorTo: (node.properties["anchor_to"] as string) ?? "top_left"
  };
}

function findByName(node: ElementNode, name: string): ElementNode | null {
  if (node.name === name) return node;
  for (const child of node.children) {
    const found = findByName(child, name);
    if (found) return found;
  }
  return null;
}

export class AddonPackBuilder {
  public async build(options: AddonBuildOptions): Promise<AddonBuildResult> {
    const warnings: string[] = [];
    const packNamespace = toNamespace(options.packName);
    const zip = new JSZip();

    // A HUD overlay runs nothing, so it ships as a single resource pack. One
    // pack belongs in a .mcpack with the manifest at the archive root; the
    // folder-per-pack layout of a .mcaddon is only right when there are two.
    const hud = options.screenTarget === "hud";
    const scoreboard = options.screenTarget === "scoreboard";
    const needsScript = (!hud && !scoreboard) || Boolean(options.sidebarObjective);
    const rpDir = needsScript ? `${packNamespace}_RP/` : "";
    const bpDir = `${packNamespace}_BP/`;

    const collector = new TextureCollector(packNamespace);
    const routes: ScreenRoute[] = [];
    const uiDefs: string[] = [];

    for (const screen of options.screens) {
      const namespace = screen.namespace || toNamespace(screen.name);
      if (screen.root.children.length === 0) {
        warnings.push(`Screen "${screen.name}" is empty - it will open blank.`);
      }

      // The sidebar is placed by the scoreboard file, so the artwork is
      // serialized on its own and in editor units.
      const body = scoreboard ? sidebarBody(screen.root) : screen.root;
      const serializer = new ScreenSerializer({
        namespace,
        resolveTexture: collector.resolve,
        omitControlNineslice: true,
        scaleMode: scoreboard ? "absolute" : options.scaleMode ?? "fit",
        fillParent: scoreboard
      });

      const path = `ui/${packNamespace}/${namespace}.json`;
      zip.file(`${rpDir}${path}`, serializer.serializeToString(body));
      uiDefs.push(path);
      routes.push({ flag: sanitizeFlag(screen.name), namespace });
    }

    // Neither server_form.json nor hud_screen.json goes into _ui_defs: both
    // carry the name of a vanilla screen.
    if (scoreboard) {
      zip.file(`${rpDir}ui/scoreboards.json`, scoreboardsTemplate(this.sidebarLayout(options, routes[0]?.namespace ?? packNamespace)));
    } else if (hud) {
      zip.file(`${rpDir}ui/hud_screen.json`, hudScreenTemplate(routes));
    } else {
      zip.file(`${rpDir}ui/server_form.json`, serverFormTemplate(routes));
    }
    zip.file(`${rpDir}ui/_ui_defs.json`, JSON.stringify({ ui_defs: uiDefs }, null, 4));

    await this.writeTextures(zip, rpDir, collector, warnings);
    for (const name of collector.unresolved()) {
      warnings.push(`Texture "${name}" is not in the library - the path is shipped as written.`);
    }

    const identity = nextPackIdentity(packNamespace);
    const api = SCRIPT_API_VERSIONS[options.scriptApi];
    zip.file(`${rpDir}manifest.json`, this.resourceManifest(options.packName, identity));

    if (needsScript) {
      zip.file(`${bpDir}manifest.json`, this.behaviorManifest(options.packName, identity, api));
      zip.file(
        `${bpDir}scripts/main.js`,
        generateScript(options.screens, {
          triggerItem: options.triggerItem,
          resolveTexture: collector.resolve,
          sidebarObjective: options.sidebarObjective
        })
      );
    }

    // Instructions live inside the packs so they do not disturb the import.
    const readme = this.readme(options, packNamespace, routes, api, identity.version);
    zip.file(`${rpDir}README.txt`, readme);
    if (needsScript) zip.file(`${bpDir}README.txt`, readme);

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const files: string[] = [];
    zip.forEach(path => files.push(path));

    const extension = needsScript ? "mcaddon" : "mcpack";
    return { blob, filename: `${packNamespace}.${extension}`, files: files.sort(), warnings };
  }

  /**
   * Where the objective title and the name/score rows go inside the board.
   *
   * An element named `scoreboard_title` or `scoreboard_entries` in the project
   * decides it; without them the vanilla arrangement is used - title across the
   * top, rows filling the rest.
   */
  private sidebarLayout(options: AddonBuildOptions, namespace: string) {
    const root = options.screens[0]?.root;
    const body = root ? sidebarBody(root) : null;
    const board: SidebarBox = body
      ? boxOf(body)
      : { size: [120, 60], offset: [4, 4], anchorFrom: "top_left", anchorTo: "top_left" };

    const titleNode = body ? findByName(body, TITLE_MARKER) : null;
    const entriesNode = body ? findByName(body, ENTRIES_MARKER) : null;

    const title: SidebarBox = titleNode
      ? boxOf(titleNode)
      : {
          size: [board.size[0], 10],
          offset: [0, 1],
          anchorFrom: "top_middle",
          anchorTo: "top_middle"
        };

    const entries: SidebarBox = entriesNode
      ? boxOf(entriesNode)
      : {
          size: [board.size[0] - 8, Math.max(10, board.size[1] - 14)],
          offset: [0, 12],
          anchorFrom: "top_middle",
          anchorTo: "top_middle"
        };

    return {
      namespace,
      board,
      title,
      entries,
      showTitle: options.showObjectiveTitle !== false,
      showRows: options.showScoreRows !== false
    };
  }

  private async writeTextures(
    zip: JSZip,
    rpDir: string,
    collector: TextureCollector,
    warnings: string[]
  ): Promise<void> {
    const textureService = Container.resolve<TextureService>(TextureService.NAME);
    for (const texture of collector.all()) {
      let bytes: Uint8Array | null = null;
      try {
        bytes = await textureService.getBytes(texture.meta.id);
        if (!bytes) bytes = await fetchBytes(texture.meta.url);
      } catch {
        bytes = null;
      }
      if (!bytes) {
        warnings.push(`Could not read texture "${texture.meta.name}" - it will be missing from the pack.`);
        continue;
      }
      zip.file(`${rpDir}${texture.packPath}.png`, bytes);

      const slice = texture.meta.nineSlice;
      if (!slice.some(value => value !== 0)) continue;

      // base_size is the logical size the borders refer to: the sidecar of the
      // art when there is one, otherwise the real size of the PNG.
      const size = texture.meta.baseSize ?? readPngSize(bytes);
      if (!size) {
        warnings.push(`"${texture.meta.name}" is not a valid PNG; nine-slice skipped.`);
        continue;
      }

      // A border wider than the image itself leaves no middle to stretch and
      // the game draws garbage. Shipping without nine-slice beats shipping broken.
      const [left, top, right, bottom] = slice;
      if (left + right >= size[0] || top + bottom >= size[1]) {
        warnings.push(
          `Nine-slice of "${texture.meta.name}" (${slice.join(",")}) does not fit in ` +
            `${size[0]}x${size[1]} - the texture ships without it.`
        );
        continue;
      }

      zip.file(
        `${rpDir}${texture.packPath}.json`,
        JSON.stringify({ nineslice_size: slice, base_size: size }, null, 4)
      );
    }
  }

  private resourceManifest(packName: string, identity: PackIdentity): string {
    const description = "Interface built with JsonForge";
    return JSON.stringify(
      {
        format_version: 2,
        header: {
          name: `${packName} RP`,
          description,
          uuid: identity.rpHeader,
          version: identity.version,
          min_engine_version: MIN_ENGINE_VERSION
        },
        modules: [
          {
            description,
            type: "resources",
            uuid: identity.rpModule,
            version: identity.version
          }
        ]
      },
      null,
      4
    );
  }

  private behaviorManifest(
    packName: string,
    identity: PackIdentity,
    api: { server: string; ui: string }
  ): string {
    return JSON.stringify(
      {
        format_version: 2,
        header: {
          name: `${packName} BP`,
          description: "Script that opens the JsonForge screens",
          uuid: identity.bpHeader,
          version: identity.version,
          min_engine_version: MIN_ENGINE_VERSION
        },
        modules: [
          {
            description: "Scripts",
            type: "script",
            language: "javascript",
            uuid: identity.bpModule,
            version: identity.version,
            entry: "scripts/main.js"
          }
        ],
        dependencies: [
          { module_name: "@minecraft/server", version: api.server },
          { module_name: "@minecraft/server-ui", version: api.ui },
          // Pulls the resource pack along: without it the screens do not exist.
          { uuid: identity.rpHeader, version: identity.version }
        ]
      },
      null,
      4
    );
  }

  /** Instructions for a resource pack only HUD overlay. */
  private hudReadme(
    options: AddonBuildOptions,
    packNamespace: string,
    version: [number, number, number]
  ): string {
    return `${options.packName} - version ${version.join(".")}
Generated by JsonForge.

WHAT THIS IS
A HUD overlay. ui/hud_screen.json appends your layout to the vanilla HUD, so it
is drawn on top of the game all the time - no form, no button, no script.

HOW TO INSTALL
1. Double click the .mcaddon file. Minecraft imports the resource pack.
2. In a world: world settings > Resource Packs > activate ${packNamespace}_RP.
3. On a server or realm: Settings > Global Resources > activate
   ${packNamespace}_RP. Behavior packs never run on someone else's server, but a
   resource pack does, which is why this export ships without one.

IF NOTHING SHOWS UP
- Check that the pack is active and that you rejoined the world after enabling.
- Turn on the Content Log (Settings > Creator) to see texture or JSON errors.
- Another pack that also replaces ui/hud_screen.json wins if it sits higher in
  the list; move this one to the top.

CHANGING THE TEXT
The layout is static: labels and images are drawn exactly as designed. Values
that must change at runtime have to come from the game itself - the vanilla
sidebar scoreboard, the actionbar or a title.
`;
  }

  private readme(
    options: AddonBuildOptions,
    packNamespace: string,
    routes: ScreenRoute[],
    api: { server: string; ui: string },
    version: [number, number, number]
  ): string {
    const list = routes.map(route => `  - "${route.flag}"`).join("\n");
    if (options.screenTarget === "hud") return this.hudReadme(options, packNamespace, version);
    return `${options.packName} - version ${version.join(".")}
Generated by JsonForge.

HOW TO INSTALL
1. Double click the .mcaddon file - Minecraft imports both packs.
   (Or rename it to .zip and extract the two folders by hand into
   com.mojang/development_resource_packs and development_behavior_packs.)
2. In the world, enable BOTH: the resource pack ${packNamespace}_RP and the
   behavior pack ${packNamespace}_BP.
3. In the world settings, turn on "Beta APIs" (Experiments). The script does
   not run without it.
4. Join the world and use a ${options.triggerItem} with right click.

SCREENS IN THIS PACK
${list}

HOW IT WORKS
The script opens a form whose TITLE is the screen name. The file
ui/server_form.json compares the title with each name and shows the right
screen. Renaming a screen in the editor without renaming it in the script (or
the other way round) drops the game back to the vanilla form.

Button order in the script matches the editor order. Inserting a button in the
middle shifts every following index.

SIDEBAR SCOREBOARD
The scoreboard in the top right corner is drawn by the game, not by this pack:
JSON UI cannot read an arbitrary objective, so a screen file cannot print its
values. What the pack can do is create the objective and put it on the sidebar,
which the script does when a sidebar objective is set in the exporter. Restyling
that sidebar means overriding ui/hud_screen.json, which this pack does not touch.

SCOREBOARDS
A button whose action is "scoreboard" adds, removes, sets or resets a score for
the player who clicked it. Objectives listed in the script are created on world
load if they do not exist. Any button text may contain {score:objective}; the
script replaces it with the player's current score every time the form opens.

FORMS THAT ARE NOT YOURS
While this pack is active, a form whose title matches no screen here opens
empty. The pack has to replace ui/server_form.json completely in order to
route. If you need ordinary forms in the same world, disable the resource pack.

IF NOTHING SHOWS UP
- Check that both packs are enabled and Beta APIs are on.
- Turn on the Content Log (Settings > Creator) to see texture or JSON errors.
- If the script does not load, the usual cause is the API version. This pack
  declares @minecraft/server ${api.server} and @minecraft/server-ui ${api.ui};
  change it in ${packNamespace}_BP/manifest.json if your game needs another.
`;
  }
}
