import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Package, Play } from "lucide-react";
import { ModalShell } from "./ModalShell";
import { Container } from "../../core/di/Container";
import { AddonExportService, AddonExportSettings } from "../../core/services/AddonExportService";
import { ProjectService } from "../../core/services/ProjectService";
import { WorldInstallService } from "../../core/services/WorldInstallService";
import { MinecraftWorld } from "../../platform/PlatformBridge";
import { generateScript } from "../../core/addon/ScriptGenerator";
import { AddonBuildResult, toNamespace } from "../../core/addon/AddonTypes";
import { collectFormButtons } from "../../core/addon/FormButtons";
import { useProjectStore } from "../../state/projectStore";

interface Props {
  open: boolean;
  onClose(): void;
}

/** Items commonly used to open the menu - the field accepts any id. */
const COMMON_ITEMS = [
  "minecraft:stick",
  "minecraft:compass",
  "minecraft:clock",
  "minecraft:book",
  "minecraft:nether_star"
];

export function ExportAddonModal({ open, onClose }: Props) {
  const version = useProjectStore(s => s.version);
  const [settings, setSettings] = useState<AddonExportSettings | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddonBuildResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [worlds, setWorlds] = useState<MinecraftWorld[]>([]);
  const [world, setWorld] = useState("");
  const [installed, setInstalled] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const service = Container.resolve<AddonExportService>(AddonExportService.NAME);
    setSettings(service.defaults());
    setResult(null);
    setError(null);
    setInstalled(null);

    const installer = Container.resolve<WorldInstallService>(WorldInstallService.NAME);
    void installer.listWorlds().then(found => {
      setWorlds(found);
      setWorld(current => (found.some(item => item.path === current) ? current : found[0]?.path ?? ""));
    });
  }, [open]);

  const summary = useMemo(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!open || !project.hasProject()) return null;
    const root = project.getRoot();
    let elements = 0;
    const walk = (node: typeof root): void => {
      elements += node.children.length;
      for (const child of node.children) walk(child);
    };
    walk(root);
    return { elements, buttons: collectFormButtons(root).length, namespace: project.getMeta().namespace };
  }, [open, version]);

  const script = useMemo(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!open || !settings || !project.hasProject()) return "";
    // A HUD overlay is resource pack only - nothing runs, so nothing to show.
    if (settings.screenTarget !== "form" && !settings.sidebarObjective.trim()) return "";
    return generateScript(
      [
        {
          name: settings.screenName,
          namespace: project.getMeta().namespace || toNamespace(settings.screenName),
          root: project.getRoot()
        }
      ],
      { triggerItem: settings.triggerItem, sidebarObjective: settings.sidebarObjective.trim() || undefined }
    );
  }, [open, settings, version]);

  if (!settings) return <ModalShell title="Export Addon" open={open} onClose={onClose} width={640}><div /></ModalShell>;

  const patch = (partial: Partial<AddonExportSettings>) => setSettings({ ...settings, ...partial });

  // A HUD overlay runs no script, so the script settings have nothing to drive.
  const scriptless = settings.screenTarget !== "form" && !settings.sidebarObjective.trim();

  const runExport = async () => {
    setBuilding(true);
    setError(null);
    setResult(null);
    try {
      const service = Container.resolve<AddonExportService>(AddonExportService.NAME);
      setResult(await service.exportToFile(settings));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  const runInstall = async () => {
    const target = worlds.find(item => item.path === world);
    if (!target) return;

    setBuilding(true);
    setError(null);
    setResult(null);
    setInstalled(null);
    try {
      const service = Container.resolve<AddonExportService>(AddonExportService.NAME);
      const built = await service.build(settings);
      const installer = Container.resolve<WorldInstallService>(WorldInstallService.NAME);
      const report = await installer.install(built, target);
      setResult(built);
      setInstalled(`${report.world.name} - ${report.packs.join(", ")}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ModalShell title="Export Addon (.mcaddon)" open={open} onClose={onClose} width={640}>
      <div className="jf-form jf-addon">
        <div className="jf-form__row">
          <label>Pack Name</label>
          <input
            className="jf-input"
            value={settings.packName}
            spellCheck={false}
            onChange={e => patch({ packName: e.target.value })}
          />
        </div>
        <div className="jf-form__row">
          <label>Screen Name</label>
          <input
            className="jf-input"
            value={settings.screenName}
            spellCheck={false}
            onChange={e => patch({ screenName: e.target.value })}
          />
        </div>
        <div className="jf-form__row">
          <label title="A form needs your behavior pack, which servers never run; a HUD overlay is resource pack only">
            Screen Type
          </label>
          <select
            className="jf-input jf-select"
            value={settings.screenTarget}
            onChange={e => patch({ screenTarget: e.target.value as AddonExportSettings["screenTarget"] })}
          >
            <option value="form">Form - opens with the trigger item (own world)</option>
            <option value="hud">HUD overlay - always on screen (works on servers)</option>
            <option value="scoreboard">Scoreboard - replaces the vanilla sidebar (live names and scores)</option>
          </select>
        </div>

        <div className="jf-form__row">
          <label>Trigger Item</label>
          <input
            className="jf-input"
            list="jf-trigger-items"
            value={settings.triggerItem}
            spellCheck={false}
            disabled={scriptless}
            title={scriptless ? "A HUD overlay is always on screen - nothing opens it" : undefined}
            onChange={e => patch({ triggerItem: e.target.value })}
          />
          <datalist id="jf-trigger-items">
            {COMMON_ITEMS.map(item => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <div className="jf-form__row">
          <label>Script API</label>
          <select
            className="jf-input jf-select"
            value={settings.scriptApi}
            disabled={scriptless}
            onChange={e => patch({ scriptApi: e.target.value as AddonExportSettings["scriptApi"] })}
          >
            <option value="1.x">1.x - @minecraft/server 1.11.0</option>
            <option value="2.x">2.x - @minecraft/server 2.0.0</option>
          </select>
        </div>

        {settings.screenTarget === "scoreboard" && (
          <>
            <div className="jf-form__row">
              <label title="The objective's display name, drawn by the game on top of your board">
                Objective Title
              </label>
              <label className="jf-switch">
                <input
                  type="checkbox"
                  checked={settings.showObjectiveTitle}
                  onChange={e => patch({ showObjectiveTitle: e.target.checked })}
                />
                <span className="jf-switch__slider" />
              </label>
            </div>
            <div className="jf-form__row">
              <label title="The player name and score rows the game fills in">Score Rows</label>
              <label className="jf-switch">
                <input
                  type="checkbox"
                  checked={settings.showScoreRows}
                  onChange={e => patch({ showScoreRows: e.target.checked })}
                />
                <span className="jf-switch__slider" />
              </label>
            </div>
          </>
        )}

        <div className="jf-form__row">
          <label title="The vanilla scoreboard in the top right corner is filled by the game, not by JSON UI">
            Sidebar Objective
          </label>
          <input
            className="jf-input"
            placeholder="empty - leave the sidebar alone"
            value={settings.sidebarObjective}
            spellCheck={false}
            onChange={e => patch({ sidebarObjective: e.target.value })}
          />
        </div>

        <div className="jf-form__row">
          <label title="How the drawn layout maps onto the game screen">Layout</label>
          <select
            className="jf-input jf-select"
            value={settings.scaleMode}
            onChange={e => patch({ scaleMode: e.target.value as AddonExportSettings["scaleMode"] })}
          >
            <option value="fit">Fit to screen - same proportions as the editor</option>
            <option value="absolute">Absolute units - keep the drawn numbers</option>
          </select>
        </div>

        {summary && (
          <div className="jf-addon__summary">
            <span>namespace <b>{summary.namespace}</b></span>
            <span>elements <b>{summary.elements}</b></span>
            <span>form buttons <b>{summary.buttons}</b></span>
          </div>
        )}

        {script ? (
          <div className="jf-addon__section">
            <div className="jf-addon__section-head">
              <span>Generated script</span>
              <button type="button" className="jf-btn" onClick={copyScript}>
                {copied ? <Check size={13} strokeWidth={1.75} /> : <Copy size={13} strokeWidth={1.75} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="jf-addon__code">{script}</pre>
          </div>
        ) : (
          <div className="jf-addon__note">
            {settings.screenTarget === "scoreboard" ? (
              <>
                Resource pack only. ui/scoreboards.json is replaced, so your board becomes the
                vanilla sidebar scoreboard: the objective title and the name/score rows stay
                bound to the game and keep updating. Name an element{" "}
                <code>scoreboard_title</code> or <code>scoreboard_entries</code> to place them
                yourself; otherwise the title goes on top and the rows fill the rest.
              </>
            ) : (
              <>
                HUD overlay ships as a resource pack only: no behavior pack, no script, no
                trigger item. The layout is added to the vanilla HUD through ui/hud_screen.json,
                so it also shows on servers when the pack is on under Global Resources.
              </>
            )}
          </div>
        )}

        {error && (
          <div className="jf-addon__error">
            <AlertTriangle size={13} strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="jf-addon__section">
            <div className="jf-addon__section-head">
              <span>{result.filename} - {result.files.length} files</span>
            </div>
            {result.warnings.length > 0 && (
              <ul className="jf-addon__warnings">
                {result.warnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <pre className="jf-addon__code">{result.files.join("\n")}</pre>
          </div>
        )}

        {worlds.length > 0 && (
          <div className="jf-form__row">
            <label title="Writes the pack straight into the world instead of exporting a file to import by hand">
              Test World
            </label>
            <select
              className="jf-input jf-select"
              value={world}
              onChange={e => setWorld(e.target.value)}
            >
              {worlds.map(item => (
                <option key={item.path} value={item.path}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {installed && (
          <div className="jf-addon__summary">
            <span>installed into <b>{installed}</b></span>
          </div>
        )}

        <div className="jf-form__actions">
          <button type="button" className="jf-btn" onClick={onClose}>Close</button>
          {worlds.length > 0 && (
            <button type="button" className="jf-btn" disabled={building || !world} onClick={runInstall}>
              <Play size={13} strokeWidth={1.75} />
              <span>{building ? "Building..." : "Install to World"}</span>
            </button>
          )}
          <button type="button" className="jf-btn jf-btn--primary" disabled={building} onClick={runExport}>
            <Package size={13} strokeWidth={1.75} />
            <span>{building ? "Building..." : scriptless ? "Export .mcpack" : "Export .mcaddon"}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
