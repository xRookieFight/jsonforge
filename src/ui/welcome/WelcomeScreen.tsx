import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  FileInput,
  FilePlus2,
  FileText,
  FolderOpen,
  Hammer,
  Home,
  Package
} from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { PersistenceService } from "../../core/services/PersistenceService";
import { PresetService } from "../../core/services/PresetService";
import { FileService } from "../../core/services/FileService";
import { ProjectSerializer } from "../../core/io/ProjectSerializer";
import { JsonUiImporter } from "../../core/io/JsonUiImporter";
import { JfProjectFormat } from "../../core/io/JfProjectFormat";
import { ElementNode } from "../../core/element/ElementNode";
import { nanoid } from "nanoid";

interface Props {
  onEnter(): void;
}

const APP_VERSION = "0.1.1";

interface RecentEntry {
  id: string;
  name: string;
  updatedAt: number;
}

interface Template {
  id: string;
  title: string;
  description: string;
  badge: string;
  factory(): { name: string; namespace: string; root: ElementNode };
}

const TEMPLATES: Template[] = [
  {
    id: "blank",
    title: "Blank Form",
    description: "Empty 384×216 screen in JSON UI units. Build from scratch.",
    badge: "blank",
    factory: () => ({
      name: "blank_form",
      namespace: "custom_namespace",
      root: new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      })
    })
  },
  {
    id: "dialog",
    title: "Dialog Form",
    description: "Centered dialog panel with title label and nine-slice background.",
    badge: "dialog",
    factory: () => {
      const root = new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      });
      const preset = Container.resolve<PresetService>(PresetService.NAME).get("preset:dialog");
      if (preset) root.addChild(preset.factory());
      return { name: "dialog_form", namespace: "custom_namespace", root };
    }
  },
  {
    id: "list",
    title: "Form Buttons List",
    description: "Scrolling stack panel with a collection of form buttons.",
    badge: "list",
    factory: () => {
      const root = new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      });
      const preset = Container.resolve<PresetService>(PresetService.NAME).get("preset:form-list");
      if (preset) root.addChild(preset.factory());
      return { name: "form_list", namespace: "custom_namespace", root };
    }
  },
  {
    id: "scoreboard",
    title: "Scoreboard Sidebar",
    description:
      "Top-right sidebar HUD, the Hive style. Restyles the vanilla sidebar; the script creates the objective and puts it on display.",
    badge: "sidebar",
    factory: () => {
      const root = new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      });

      // The sidebar hangs on the right edge, a bit below the top - the same
      // corner the vanilla scoreboard uses.
      const sidebar = new ElementNode("panel", "sidebar", {
        size: [96, 74],
        offset: [-4, 30],
        anchor_from: "top_right",
        anchor_to: "top_right"
      });

      sidebar.addChild(
        new ElementNode("label", "sidebar_title", {
          size: [96, 12],
          offset: [0, 2],
          anchor_from: "top_middle",
          anchor_to: "top_middle",
          text: "MY SERVER",
          color: "#ffd166",
          text_alignment: "center",
          font_size: "large",
          shadow: true
        })
      );

      const lines = ["Rank: Member", "Coins: 0", "Kills: 0", "Wins: 0"];
      lines.forEach((text, index) => {
        sidebar.addChild(
          new ElementNode("label", `sidebar_line_${index + 1}`, {
            size: [90, 10],
            offset: [4, 18 + index * 12],
            anchor_from: "top_left",
            anchor_to: "top_left",
            text,
            color: "#ffffff",
            text_alignment: "left",
            shadow: true
          })
        );
      });

      root.addChild(sidebar);
      return { name: "scoreboard_sidebar", namespace: "custom_namespace", root };
    }
  },
  {
    id: "stats-menu",
    title: "Stats Menu",
    description: "Centered form with buttons that read and change a scoreboard objective when clicked.",
    badge: "score",
    factory: () => {
      const root = new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      });
      const panel = new ElementNode("panel", "score_panel", {
        size: [200, 140],
        anchor_from: "center",
        anchor_to: "center"
      });
      panel.addChild(
        new ElementNode("label", "score_title", {
          size: [180, 14],
          offset: [0, 8],
          anchor_from: "top_middle",
          anchor_to: "top_middle",
          text: "Stats",
          color: "#ffffff",
          text_alignment: "center",
          font_size: "large",
          shadow: true
        })
      );

      // The score placeholder is filled in by the generated script every time
      // the form opens, so the button doubles as a live readout.
      const buttons: Array<{ name: string; text: string; props: Record<string, unknown> }> = [
        { name: "coins_readout", text: "Coins: {score:coins}", props: { action_type: "none" } },
        {
          name: "earn_button",
          text: "Earn 5 coins",
          props: {
            action_type: "scoreboard",
            scoreboard_objective: "coins",
            scoreboard_operation: "add",
            scoreboard_amount: 5
          }
        },
        {
          name: "spend_button",
          text: "Spend 5 coins",
          props: {
            action_type: "scoreboard",
            scoreboard_objective: "coins",
            scoreboard_operation: "remove",
            scoreboard_amount: 5
          }
        },
        {
          name: "reset_button",
          text: "Reset",
          props: { action_type: "scoreboard", scoreboard_objective: "coins", scoreboard_operation: "reset" }
        }
      ];

      buttons.forEach((button, index) => {
        panel.addChild(
          new ElementNode("button", button.name, {
            size: [170, 22],
            offset: [0, 30 + index * 26],
            anchor_from: "top_middle",
            anchor_to: "top_middle",
            text: button.text,
            text_alignment: "center",
            ...button.props
          })
        );
      });

      root.addChild(panel);
      return { name: "stats_menu", namespace: "custom_namespace", root };
    }
  },
  {
    id: "hud",
    title: "HUD Overlay",
    description: "Top-left stat panel + bottom hotbar slots. Good starting HUD modification.",
    badge: "hud",
    factory: () => {
      const root = new ElementNode("panel", "root", {
        size: [384, 216],
        anchor_from: "center",
        anchor_to: "center"
      });
      const stats = new ElementNode("stack_panel", "stat_stack", {
        size: [110, 40],
        offset: [6, 6],
        anchor_from: "top_left",
        anchor_to: "top_left",
        orientation: "vertical"
      });
      stats.addChild(
        new ElementNode("label", "health_label", {
          size: [110, 10],
          text: "HP 20 / 20",
          color: "#ff5d5d",
          font_size: "large"
        })
      );
      stats.addChild(
        new ElementNode("label", "hunger_label", {
          size: [110, 10],
          text: "Hunger 20",
          color: "#f7c45c",
          font_size: "large"
        })
      );
      const hotbar = new ElementNode("stack_panel", "hotbar", {
        size: [182, 22],
        offset: [0, -6],
        anchor_from: "bottom_middle",
        anchor_to: "bottom_middle",
        orientation: "horizontal"
      });
      for (let i = 0; i < 9; i++) {
        hotbar.addChild(
          new ElementNode("image", `slot_${i}`, {
            size: [20, 20],
            texture: "textures/ui/hotbar_slot"
          })
        );
      }
      root.addChild(stats);
      root.addChild(hotbar);
      return { name: "hud_overlay", namespace: "custom_namespace", root };
    }
  }
];

export function WelcomeScreen({ onEnter }: Props) {
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("untitled_form");
  const [namespace, setNamespace] = useState("custom_namespace");

  useEffect(() => {
    const load = async () => {
      const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
      const all = await persistence.listProjects();
      const sorted = all
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
        .map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }));
      setRecents(sorted);
    };
    void load();
  }, []);

  const useTemplate = (template: Template) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const { name: n, namespace: ns, root } = template.factory();
    project.set(
      {
        id: nanoid(12),
        name: n,
        namespace: ns,
        rootId: root.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      root
    );
    onEnter();
  };

  const createCustom = () => {
    Container.resolve<ProjectService>(ProjectService.NAME).createNew(name, namespace);
    onEnter();
  };

  const openRecent = async (id: string) => {
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    const row = await persistence.getProject(id);
    if (!row) return;
    const snapshot = row.data as { meta: { id: string; name: string; namespace: string; rootId: string; createdAt: number; updatedAt: number }; root: ReturnType<ElementNode["toData"]> };
    Container.resolve<ProjectService>(ProjectService.NAME).load(snapshot);
    onEnter();
  };

  const openProjectFile = async () => {
    const fileService = Container.resolve<FileService>(FileService.NAME);
    const result = await fileService.openFile([
      { name: "JsonForge Bundle", extensions: ["jfproject"] },
      { name: "JsonForge Outline", extensions: ["jfproj", "json"] }
    ]);
    if (!result) return;
    const looksBundled = result.handle.name.endsWith(".jfproject") || result.content.includes('"format":"jfproject"') || result.content.includes('"format": "jfproject"');
    if (looksBundled) {
      await JfProjectFormat.import(result.content);
    } else {
      const snapshot = ProjectSerializer.fromJson(result.content);
      Container.resolve<ProjectService>(ProjectService.NAME).load(snapshot);
    }
    onEnter();
  };

  const importJsonUi = async () => {
    const fileService = Container.resolve<FileService>(FileService.NAME);
    const result = await fileService.openFile([{ name: "JSON UI", extensions: ["json"] }]);
    if (!result) return;
    const { namespace: ns, root } = new JsonUiImporter().import(result.content);
    Container.resolve<ProjectService>(ProjectService.NAME).set(
      {
        id: nanoid(12),
        name: root.name,
        namespace: ns,
        rootId: root.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      root
    );
    onEnter();
  };

  return (
    <div className="jf-welcome">
      <aside className="jf-welcome__sidebar">
        <div className="jf-welcome__brand">
          <span className="jf-welcome__logo-tile">
            <Hammer size={20} strokeWidth={2.25} className="jf-welcome__logo" />
          </span>
          <div className="jf-welcome__brand-text">
            <div className="jf-welcome__title">JsonForge</div>
            <div className="jf-welcome__subtitle">Bedrock JSON UI editor</div>
          </div>
        </div>

        <nav className="jf-welcome__nav">
          <div className="jf-welcome__nav-caption">Start</div>
          <button
            type="button"
            className={"jf-welcome__nav-btn" + (creating ? "" : " jf-welcome__nav-btn--active")}
            onClick={() => setCreating(false)}
          >
            <Home size={15} strokeWidth={1.75} className="jf-welcome__nav-icon" />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={"jf-welcome__nav-btn" + (creating ? " jf-welcome__nav-btn--active" : "")}
            onClick={() => setCreating(true)}
          >
            <FilePlus2 size={15} strokeWidth={1.75} className="jf-welcome__nav-icon" />
            <span>New Project</span>
            <kbd>Ctrl N</kbd>
          </button>
          <button type="button" className="jf-welcome__nav-btn" onClick={openProjectFile}>
            <FolderOpen size={15} strokeWidth={1.75} className="jf-welcome__nav-icon" />
            <span>Open Project</span>
            <kbd>Ctrl O</kbd>
          </button>
          <button type="button" className="jf-welcome__nav-btn" onClick={importJsonUi}>
            <FileInput size={15} strokeWidth={1.75} className="jf-welcome__nav-icon" />
            <span>Import JSON UI</span>
          </button>
        </nav>

        <div className="jf-welcome__nav">
          <div className="jf-welcome__nav-caption">
            Recent <span>{recents.length}</span>
          </div>
          {recents.length === 0 ? (
            <p className="jf-welcome__nav-empty">Saved projects show up here.</p>
          ) : (
            recents.slice(0, 5).map(entry => (
              <button
                key={entry.id}
                type="button"
                className="jf-welcome__nav-btn jf-welcome__nav-btn--recent"
                title={`${entry.name} · ${formatDate(entry.updatedAt)}`}
                onClick={() => openRecent(entry.id)}
              >
                <Clock size={14} strokeWidth={1.75} className="jf-welcome__nav-icon" />
                <span>{entry.name}</span>
                <ChevronRight size={13} strokeWidth={1.75} className="jf-welcome__nav-go" />
              </button>
            ))
          )}
        </div>

        <div className="jf-welcome__footer">
          <span className="jf-welcome__version">v{APP_VERSION}</span>
          <span className="jf-welcome__tag">client-only</span>
        </div>
      </aside>
      <div className="jf-welcome__main">
        {creating ? (
          <div className="jf-welcome__create">
            <h1>Create new project</h1>
            <p className="jf-welcome__lead">Name your project and namespace, or pick a template below.</p>
            <div className="jf-welcome__create-form">
              <label>
                <span>Project name</span>
                <input className="jf-input" value={name} onChange={e => setName(e.target.value)} />
              </label>
              <label>
                <span>Namespace</span>
                <input className="jf-input" value={namespace} onChange={e => setNamespace(e.target.value)} />
              </label>
              <div className="jf-welcome__create-actions">
                <button type="button" className="jf-btn jf-btn--ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button type="button" className="jf-btn jf-btn--primary" onClick={createCustom}>Create Blank</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="jf-welcome__hero">
              <span className="jf-welcome__hero-badge">Minecraft Bedrock · JSON UI</span>
              <h1>Build screens the game already understands</h1>
              <p className="jf-welcome__lead">
                Draw the interface, drop in textures, export a ready <code>.mcaddon</code>.
                Start from a template, reopen a recent project or import an existing
                <code>.json</code> file.
              </p>
              <div className="jf-welcome__quick">
                <button type="button" className="jf-quick-card" onClick={() => setCreating(true)}>
                  <FilePlus2 size={16} strokeWidth={1.75} />
                  <span className="jf-quick-card__title">New Project</span>
                  <span className="jf-quick-card__hint">Blank screen, your namespace</span>
                </button>
                <button type="button" className="jf-quick-card" onClick={openProjectFile}>
                  <FolderOpen size={16} strokeWidth={1.75} />
                  <span className="jf-quick-card__title">Open Project</span>
                  <span className="jf-quick-card__hint">.jfproject or outline</span>
                </button>
                <button type="button" className="jf-quick-card" onClick={importJsonUi}>
                  <FileInput size={16} strokeWidth={1.75} />
                  <span className="jf-quick-card__title">Import JSON UI</span>
                  <span className="jf-quick-card__hint">Bring a vanilla file in</span>
                </button>
              </div>
            </div>

            <section className="jf-welcome__section">
              <div className="jf-welcome__section-head">
                <h2>Templates</h2>
                <span>{TEMPLATES.length} starting points</span>
              </div>
              <div className="jf-welcome__template-grid">
                {TEMPLATES.map(template => (
                  <button key={template.id} type="button" className="jf-template-card" onClick={() => useTemplate(template)}>
                    <div className={"jf-template-card__preview jf-template-card__preview--" + template.id}>
                      <Package size={14} strokeWidth={1.75} className="jf-template-card__badge-icon" />
                      <span className="jf-template-card__badge">{template.badge}</span>
                    </div>
                    <div className="jf-template-card__title">{template.title}</div>
                    <div className="jf-template-card__description">{template.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="jf-welcome__section">
              <div className="jf-welcome__section-head">
                <h2>Recent projects</h2>
                <span>{recents.length} saved locally</span>
              </div>
              {recents.length === 0 ? (
                <div className="jf-welcome__empty">
                  No recent projects yet. Save a project once to see it listed here.
                </div>
              ) : (
                <ul className="jf-welcome__recent-list">
                  {recents.map(entry => (
                    <li key={entry.id}>
                      <button type="button" className="jf-recent-row" onClick={() => openRecent(entry.id)}>
                        <FileText size={15} strokeWidth={1.75} className="jf-recent-row__icon" />
                        <span className="jf-recent-row__name">{entry.name}</span>
                        <span className="jf-recent-row__date">{formatDate(entry.updatedAt)}</span>
                        <ArrowRight size={13} strokeWidth={1.75} className="jf-recent-row__go" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
