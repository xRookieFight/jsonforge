import { Service, ServicePriority } from "../base/Service";
import { Container } from "../di/Container";
import { ProjectService } from "./ProjectService";
import { PersistenceService } from "./PersistenceService";

export class AutoSaveService extends Service {
  public static readonly NAME = "AutoSaveService";

  private unsubscribe: (() => void) | null = null;
  private pending: ReturnType<typeof setTimeout> | null = null;

  public getName(): string {
    return AutoSaveService.NAME;
  }

  public getPriority(): ServicePriority {
    return ServicePriority.EXPORT;
  }

  public async onEnable(): Promise<void> {
    await super.onEnable();
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    this.unsubscribe = project.bus.on("project:dirty", () => this.schedule());
  }

  public async onDisable(): Promise<void> {
    await super.onDisable();
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.pending) clearTimeout(this.pending);
    this.pending = null;
  }

  private schedule(): void {
    if (this.pending) clearTimeout(this.pending);
    this.pending = setTimeout(() => this.flush(), 800);
  }

  private async flush(): Promise<void> {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (!project.hasProject()) return;
    const persistence = Container.resolve<PersistenceService>(PersistenceService.NAME);
    const snapshot = project.snapshot();
    await persistence.putProject(snapshot.meta.id, snapshot.meta.name, snapshot);
  }
}
