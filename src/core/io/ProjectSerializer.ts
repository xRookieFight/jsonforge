import { ProjectSnapshot } from "../services/ProjectService";

export class ProjectSerializer {
  public static toJson(snapshot: ProjectSnapshot): string {
    return JSON.stringify({ version: 1, ...snapshot }, null, 2);
  }

  public static fromJson(text: string): ProjectSnapshot {
    const parsed = JSON.parse(text) as { version?: number } & ProjectSnapshot;
    if (parsed.version !== 1) {
      throw new Error(`Unsupported project version: ${parsed.version}`);
    }
    return { meta: parsed.meta, root: parsed.root };
  }
}
