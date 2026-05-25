export enum ServicePriority {
  PLATFORM = 0,
  PERSISTENCE = 100,
  PROJECT = 200,
  ELEMENT = 300,
  SELECTION = 400,
  HISTORY = 500,
  TEXTURE = 600,
  BINDING = 700,
  PRESET = 800,
  KEYBOARD = 900,
  EXPORT = 1000
}

export abstract class Service {
  protected ready = false;

  public abstract getName(): string;

  public getPriority(): ServicePriority {
    return ServicePriority.PROJECT;
  }

  public async onLoad(): Promise<void> {}

  public async onEnable(): Promise<void> {
    this.ready = true;
  }

  public async onDisable(): Promise<void> {
    this.ready = false;
  }

  public isReady(): boolean {
    return this.ready;
  }
}
