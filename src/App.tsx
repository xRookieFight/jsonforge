import { useEffect, useMemo, useState } from "react";
import { MosaicNode } from "react-mosaic-component";
import { MenuBar } from "./ui/layout/MenuBar";
import { StatusBar } from "./ui/layout/StatusBar";
import { DockLayout, DockId } from "./ui/layout/DockLayout";
import { ToolboxPanel } from "./ui/panels/ToolboxPanel";
import { HierarchyPanel } from "./ui/panels/HierarchyPanel";
import { CanvasPanel } from "./ui/panels/CanvasPanel";
import { PropertiesPanel } from "./ui/panels/PropertiesPanel";
import { TexturesPanel } from "./ui/panels/TexturesPanel";
import { BindingsPanel } from "./ui/panels/BindingsPanel";
import { JsonPreviewPanel } from "./ui/panels/JsonPreviewPanel";
import { HistoryPanel } from "./ui/panels/HistoryPanel";
import { NewProjectModal } from "./ui/modals/NewProjectModal";
import { SettingsModal } from "./ui/modals/SettingsModal";
import { AboutModal } from "./ui/modals/AboutModal";
import { WelcomeScreen } from "./ui/welcome/WelcomeScreen";
import { useServiceSync } from "./hooks/useServices";
import { Container } from "./core/di/Container";
import { ProjectService } from "./core/services/ProjectService";
import { HistoryService } from "./core/services/HistoryService";
import { KeyboardService } from "./core/services/KeyboardService";
import { PlatformService } from "./core/services/PlatformService";
import { JfProjectFormat } from "./core/io/JfProjectFormat";
import { ElementNode } from "./core/element/ElementNode";
import { useProjectStore } from "./state/projectStore";

function countElements(node: ElementNode): number {
  let n = 1;
  for (const child of node.children) n += countElements(child);
  return n;
}

const DEFAULT_LAYOUT: MosaicNode<DockId> = {
  direction: "row",
  first: {
    direction: "column",
    first: "toolbox",
    second: "hierarchy",
    splitPercentage: 38
  },
  second: {
    direction: "row",
    first: {
      direction: "column",
      first: "canvas",
      second: {
        direction: "row",
        first: "json",
        second: "history",
        splitPercentage: 60
      },
      splitPercentage: 65
    },
    second: {
      direction: "column",
      first: "properties",
      second: {
        direction: "column",
        first: "textures",
        second: "bindings",
        splitPercentage: 40
      },
      splitPercentage: 55
    },
    splitPercentage: 72
  },
  splitPercentage: 18
};

export function App() {
  useServiceSync();

  const refresh = useProjectStore(s => s.refreshFromServices);
  const deleteSelected = useProjectStore(s => s.deleteSelected);
  const duplicateSelected = useProjectStore(s => s.duplicateSelected);
  const copySelection = useProjectStore(s => s.copySelection);
  const cutSelection = useProjectStore(s => s.cutSelection);
  const paste = useProjectStore(s => s.paste);

  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [layout, setLayout] = useState<MosaicNode<DockId> | null>(DEFAULT_LAYOUT);
  const [hasProject, setHasProject] = useState(false);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    setHasProject(project.hasProject());
    const offChanged = project.bus.on("project:changed", () => setHasProject(true));
    const offClosed = project.bus.on("project:closed", () => setHasProject(false));
    return () => {
      offChanged();
      offClosed();
    };
  }, []);

  useEffect(() => {
    if (!hasProject) return;
    const keyboard = Container.resolve<KeyboardService>(KeyboardService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    keyboard.register({ id: "undo", combo: "mod+z", description: "Undo", handler: () => history.undo() });
    keyboard.register({ id: "redo", combo: "mod+shift+z", description: "Redo", handler: () => history.redo() });
    keyboard.register({ id: "delete", combo: "delete", description: "Delete", handler: () => deleteSelected() });
    keyboard.register({ id: "backspace", combo: "backspace", description: "Delete", handler: () => deleteSelected() });
    keyboard.register({ id: "duplicate", combo: "mod+d", description: "Duplicate", handler: () => duplicateSelected() });
    keyboard.register({ id: "copy", combo: "mod+c", description: "Copy", handler: () => copySelection() });
    keyboard.register({ id: "cut", combo: "mod+x", description: "Cut", handler: () => cutSelection() });
    keyboard.register({ id: "paste", combo: "mod+v", description: "Paste", handler: () => paste() });
    keyboard.register({ id: "newProject", combo: "mod+n", description: "New Project", handler: () => setShowNewProject(true) });
    keyboard.register({ id: "settings", combo: "mod+,", description: "Settings", handler: () => setShowSettings(true) });
    return () => {
      ["undo", "redo", "delete", "backspace", "duplicate", "copy", "cut", "paste", "newProject", "settings"].forEach(id => keyboard.unregister(id));
    };
  }, [hasProject, deleteSelected, duplicateSelected, copySelection, cutSelection, paste]);

  useEffect(() => {
    const platform = Container.resolve<PlatformService>(PlatformService.NAME);
    if (!platform.isElectron()) return;
    const bridge = platform.getBridge();
    const offs = [
      bridge.onMenu("menu:newProject", () => setShowNewProject(true)),
      bridge.onMenu("menu:settings", () => setShowSettings(true)),
      bridge.onMenu("menu:about", () => setShowAbout(true)),
      bridge.onMenu("menu:undo", () => Container.resolve<HistoryService>(HistoryService.NAME).undo()),
      bridge.onMenu("menu:redo", () => Container.resolve<HistoryService>(HistoryService.NAME).redo())
    ];
    return () => offs.forEach(off => off());
  }, []);

  useEffect(() => {
    const api = window.jsonforge;
    if (!api?.discord) return;
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const push = () => {
      if (!project.hasProject()) {
        void api.discord.setIdle();
        return;
      }
      const meta = project.getMeta();
      const root = project.getRoot();
      const count = countElements(root);
      void api.discord.setActivity({
        details: `Editing ${meta.name}`,
        state: `${count} element${count === 1 ? "" : "s"} · ${meta.namespace}`,
        startTimestamp: meta.createdAt
      });
    };
    push();
    const offChanged = project.bus.on("project:changed", push);
    const offDirty = project.bus.on("project:tree-changed", push);
    const offClosed = project.bus.on("project:closed", push);
    return () => {
      offChanged();
      offDirty();
      offClosed();
    };
  }, [hasProject]);

  useEffect(() => {
    const api = window.jsonforge;
    if (!api) return;
    const handleOpen = async (path: string) => {
      try {
        const content = await api.fs.readFile(path, "utf-8");
        await JfProjectFormat.import(content);
        setHasProject(true);
        refresh();
      } catch (err) {
        console.error("Failed to open .jfproject file:", err);
      }
    };
    api.file.consumeOpenRequest().then(path => {
      if (path) void handleOpen(path);
    });
    const off = api.file.onOpenRequest(path => void handleOpen(path));
    return () => off();
  }, [refresh]);

  const panels = useMemo(
    () => ({
      toolbox: { title: "Toolbox", content: <ToolboxPanel /> },
      hierarchy: { title: "Hierarchy", content: <HierarchyPanel /> },
      canvas: { title: "Canvas", content: <CanvasPanel /> },
      properties: { title: "Properties", content: <PropertiesPanel /> },
      textures: { title: "Textures", content: <TexturesPanel /> },
      bindings: { title: "Bindings", content: <BindingsPanel /> },
      json: { title: "JSON UI", content: <JsonPreviewPanel /> },
      history: { title: "History", content: <HistoryPanel /> }
    }),
    []
  );

  if (!hasProject) {
    return (
      <div className="jf-app">
        <WelcomeScreen
          onEnter={() => {
            setHasProject(true);
            refresh();
          }}
        />
        <NewProjectModal
          open={showNewProject}
          onClose={() => {
            setShowNewProject(false);
            refresh();
          }}
        />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
        <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      </div>
    );
  }

  return (
    <div className="jf-app">
      <MenuBar
        onShowSettings={() => setShowSettings(true)}
        onShowAbout={() => setShowAbout(true)}
        onShowNewProject={() => setShowNewProject(true)}
        onCloseProject={() => Container.resolve<ProjectService>(ProjectService.NAME).close()}
      />
      <div className="jf-app__body">
        <DockLayout panels={panels} initial={layout ?? DEFAULT_LAYOUT} onChange={setLayout} />
      </div>
      <StatusBar />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
