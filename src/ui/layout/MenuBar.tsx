import { useEffect, useRef, useState } from "react";
import { Hammer } from "lucide-react";
import { useProjectStore } from "../../state/projectStore";
import { Container } from "../../core/di/Container";
import { HistoryService } from "../../core/services/HistoryService";
import { ProjectService } from "../../core/services/ProjectService";
import { FileService } from "../../core/services/FileService";
import { JsonUiExporter } from "../../core/io/JsonUiExporter";
import { JsonUiImporter } from "../../core/io/JsonUiImporter";
import { ProjectSerializer } from "../../core/io/ProjectSerializer";
import { JfProjectFormat } from "../../core/io/JfProjectFormat";

interface Props {
  onShowSettings(): void;
  onShowAbout(): void;
  onShowNewProject(): void;
  onShowExportAddon(): void;
  onCloseProject(): void;
}

interface MenuDef {
  label: string;
  items: Array<{ label: string; shortcut?: string; action(): void } | { separator: true }>;
}

export function MenuBar({ onShowSettings, onShowAbout, onShowNewProject, onShowExportAddon, onCloseProject }: Props) {
  const namespace = useProjectStore(s => s.namespace);
  const dirty = useProjectStore(s => s.dirty);
  const rootName = useProjectStore(s => s.rootName);
  const setNamespace = useProjectStore(s => s.setNamespace);

  const [open, setOpen] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const file: MenuDef = {
    label: "File",
    items: [
      { label: "New Project", shortcut: "Ctrl+N", action: onShowNewProject },
      { label: "Open .jfproject...", shortcut: "Ctrl+O", action: () => openBundle() },
      { label: "Save .jfproject", shortcut: "Ctrl+S", action: () => saveBundle() },
      { separator: true },
      { label: "Save Project Outline", action: () => saveProject() },
      { label: "Open Project Outline...", action: () => openProject() },
      { separator: true },
      { label: "Import JSON UI...", action: () => importJsonUi() },
      { label: "Export JSON UI...", action: () => exportJsonUi() },
      { label: "Export Addon (.mcaddon)...", action: onShowExportAddon },
      { separator: true },
      { label: "Close Project", action: onCloseProject }
    ]
  };

  const edit: MenuDef = {
    label: "Edit",
    items: [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => Container.resolve<HistoryService>(HistoryService.NAME).undo() },
      { label: "Redo", shortcut: "Ctrl+Shift+Z", action: () => Container.resolve<HistoryService>(HistoryService.NAME).redo() },
      { separator: true },
      { label: "Settings", shortcut: "Ctrl+,", action: onShowSettings }
    ]
  };

  const help: MenuDef = {
    label: "Help",
    items: [{ label: "About JsonForge", action: onShowAbout }]
  };

  const menus: MenuDef[] = [file, edit, help];

  return (
    <div className="jf-menubar" ref={wrapperRef}>
      <div className="jf-menubar__brand">
        <Hammer size={16} strokeWidth={2} className="jf-menubar__logo" />
        <span className="jf-menubar__title">JsonForge</span>
      </div>
      <div className="jf-menubar__menus">
        {menus.map(menu => (
          <div key={menu.label} className="jf-menubar__menu">
            <button
              type="button"
              className={"jf-menubar__btn" + (open === menu.label ? " jf-menubar__btn--open" : "")}
              onClick={() => setOpen(open === menu.label ? null : menu.label)}
            >
              {menu.label}
            </button>
            {open === menu.label && (
              <div className="jf-menubar__dropdown">
                {menu.items.map((item, idx) =>
                  "separator" in item ? (
                    <div key={"sep-" + idx} className="jf-menubar__sep" />
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      className="jf-menubar__item"
                      onClick={() => {
                        item.action();
                        setOpen(null);
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="jf-menubar__shortcut">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="jf-menubar__right">
        <label className="jf-menubar__field">
          <span>namespace</span>
          <input
            className="jf-input jf-input--inline"
            value={namespace}
            onChange={e => setNamespace(e.target.value)}
          />
        </label>
        <span className="jf-menubar__doc">
          {rootName}
          {dirty ? " •" : ""}
        </span>
      </div>
    </div>
  );
}

async function openProject(): Promise<void> {
  const fileService = Container.resolve<FileService>(FileService.NAME);
  const result = await fileService.openFile([{ name: "JsonForge Project", extensions: ["jfproj", "json"] }]);
  if (!result) return;
  const snapshot = ProjectSerializer.fromJson(result.content);
  const project = Container.resolve<ProjectService>(ProjectService.NAME);
  project.load(snapshot);
}

async function saveProject(): Promise<void> {
  const project = Container.resolve<ProjectService>(ProjectService.NAME);
  if (!project.hasProject()) return;
  const fileService = Container.resolve<FileService>(FileService.NAME);
  const snapshot = project.snapshot();
  const text = ProjectSerializer.toJson(snapshot);
  await fileService.saveFile(text, project.getMeta().name + ".jfproj", [
    { name: "JsonForge Project", extensions: ["jfproj"] }
  ]);
  project.markClean();
}

async function importJsonUi(): Promise<void> {
  const fileService = Container.resolve<FileService>(FileService.NAME);
  const result = await fileService.openFile([{ name: "JSON UI", extensions: ["json"] }]);
  if (!result) return;
  const importer = new JsonUiImporter();
  const { namespace, root } = importer.import(result.content);
  const project = Container.resolve<ProjectService>(ProjectService.NAME);
  const meta = project.hasProject()
    ? { ...project.getMeta(), namespace, rootId: root.id, updatedAt: Date.now() }
    : { id: root.id, name: root.name, namespace, rootId: root.id, createdAt: Date.now(), updatedAt: Date.now() };
  project.set(meta, root);
}

async function exportJsonUi(): Promise<void> {
  const project = Container.resolve<ProjectService>(ProjectService.NAME);
  if (!project.hasProject()) return;
  const exporter = new JsonUiExporter();
  const result = exporter.export(project.getMeta().namespace, project.getRoot());
  const fileService = Container.resolve<FileService>(FileService.NAME);
  await fileService.saveFile(result.text, project.getRoot().name + ".json", [
    { name: "JSON UI", extensions: ["json"] }
  ]);
}

async function saveBundle(): Promise<void> {
  const project = Container.resolve<ProjectService>(ProjectService.NAME);
  if (!project.hasProject()) return;
  const text = await JfProjectFormat.export();
  const fileService = Container.resolve<FileService>(FileService.NAME);
  await fileService.saveFile(text, project.getMeta().name + "." + JfProjectFormat.EXTENSION, [
    { name: "JsonForge Bundle", extensions: [JfProjectFormat.EXTENSION] }
  ]);
  project.markClean();
}

async function openBundle(): Promise<void> {
  const fileService = Container.resolve<FileService>(FileService.NAME);
  const result = await fileService.openFile([
    { name: "JsonForge Bundle", extensions: [JfProjectFormat.EXTENSION] }
  ]);
  if (!result) return;
  await JfProjectFormat.import(result.content);
}
