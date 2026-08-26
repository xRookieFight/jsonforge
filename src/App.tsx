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
import { NewProjectModal } from "./ui/modals/NewProjectModal";
import { SettingsModal } from "./ui/modals/SettingsModal";
import { AboutModal } from "./ui/modals/AboutModal";
import { ExportAddonModal } from "./ui/modals/ExportAddonModal";
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
import { useEditorStore } from "./state/editorStore";

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
      second: "json",
      splitPercentage: 68
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
  const nudgeSelection = useProjectStore(s => s.nudgeSelection);

  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showExportAddon, setShowExportAddon] = useState(false);
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

    // Arrow keys nudge the selection: one unit, or a whole grid step with shift.
    const arrows: Array<{ key: string; dx: number; dy: number }> = [
      { key: "arrowleft", dx: -1, dy: 0 },
      { key: "arrowright", dx: 1, dy: 0 },
      { key: "arrowup", dx: 0, dy: -1 },
      { key: "arrowdown", dx: 0, dy: 1 }
    ];
    for (const arrow of arrows) {
      keyboard.register({
        id: "nudge-" + arrow.key,
        combo: arrow.key,
        description: "Nudge selection",
        handler: () => nudgeSelection(arrow.dx, arrow.dy)
      });
      keyboard.register({
        id: "nudge-shift-" + arrow.key,
        combo: "shift+" + arrow.key,
        description: "Nudge selection by grid step",
        handler: () => {
          const step = Math.max(1, useEditorStore.getState().gridSize);
          nudgeSelection(arrow.dx * step, arrow.dy * step);
        }
      });
    }

    return () => {
      ["undo", "redo", "delete", "backspace", "duplicate", "copy", "cut", "paste", "newProject", "settings"].forEach(id => keyboard.unregister(id));
      for (const arrow of arrows) {
        keyboard.unregister("nudge-" + arrow.key);
        keyboard.unregister("nudge-shift-" + arrow.key);
      }
    };
  }, [hasProject, deleteSelected, duplicateSelected, copySelection, cutSelection, paste, nudgeSelection]);

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
    let lastSig = "";
    let dirtyTimer: ReturnType<typeof setTimeout> | null = null;
    const sendActivity = () => {
      if (!project.hasProject()) {
        console.log("[discord] sendActivity skipped: no project");
        return;
      }
      const meta = project.getMeta();
      const root = project.getRoot();
      const count = countElements(root);
      const sig = `act|${meta.id}|${meta.name}|${meta.namespace}|${count}`;
      if (sig === lastSig) return;
      lastSig = sig;
      const payload = {
        details: `Editing ${meta.name}`,
        state: `${count} element${count === 1 ? "" : "s"} · ${meta.namespace}`,
        startTimestamp: meta.createdAt
      };
      console.log("[discord] -> activity", payload);
      void api.discord.setActivity(payload);
    };
    const sendIdle = () => {
      const sig = "idle";
      if (sig === lastSig) return;
      lastSig = sig;
      console.log("[discord] -> idle");
      void api.discord.setIdle();
    };
    let retry: ReturnType<typeof setTimeout> | null = null;
    const forceResend = () => {
      lastSig = "";
      if (project.hasProject()) sendActivity();
      else sendIdle();
    };
    if (project.hasProject()) sendActivity();
    else sendIdle();
    retry = setTimeout(forceResend, 3000);
    const offChanged = project.bus.on("project:changed", () => {
      console.log("[discord] project:changed event received");
      if (retry) { clearTimeout(retry); retry = null; }
      sendActivity();
      retry = setTimeout(forceResend, 3000);
    });
    const offClosed = project.bus.on("project:closed", () => {
      if (retry) { clearTimeout(retry); retry = null; }
      sendIdle();
    });
    const offDirty = project.bus.on("project:tree-changed", () => {
      if (dirtyTimer) clearTimeout(dirtyTimer);
      dirtyTimer = setTimeout(sendActivity, 1000);
    });
    return () => {
      if (dirtyTimer) clearTimeout(dirtyTimer);
      if (retry) clearTimeout(retry);
      offChanged();
      offDirty();
      offClosed();
    };
  }, []);

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
      json: { title: "JSON UI", content: <JsonPreviewPanel /> }
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
        onShowExportAddon={() => setShowExportAddon(true)}
        onCloseProject={() => Container.resolve<ProjectService>(ProjectService.NAME).close()}
      />
      <div className="jf-app__body">
        <DockLayout panels={panels} initial={layout ?? DEFAULT_LAYOUT} onChange={setLayout} />
      </div>
      <StatusBar />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <ExportAddonModal open={showExportAddon} onClose={() => setShowExportAddon(false)} />
    </div>
  );
}
