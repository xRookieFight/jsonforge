import { useEffect } from "react";
import { Container } from "../core/di/Container";
import { ProjectService } from "../core/services/ProjectService";
import { SelectionService } from "../core/services/SelectionService";
import { HistoryService } from "../core/services/HistoryService";
import { useProjectStore } from "../state/projectStore";

export function useServiceSync(): void {
  const refresh = useProjectStore(s => s.refreshFromServices);
  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const unsubs = [
      project.bus.on("project:changed", () => refresh()),
      project.bus.on("project:tree-changed", () => refresh()),
      project.bus.on("project:dirty", () => refresh()),
      selection.bus.on("selection:changed", () => refresh()),
      history.bus.on("history:changed", () => refresh())
    ];
    return () => unsubs.forEach(u => u());
  }, [refresh]);
}
