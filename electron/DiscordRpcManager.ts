import { DISCORD_CLIENT_ID, DISCORD_RPC_DEFAULTS } from "./discordConfig";

export interface DiscordActivityState {
  state?: string;
  details?: string;
  startTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
}

export class DiscordRpcManager {
  private client: import("discord-rpc").Client | null = null;
  private ready = false;
  private startedAt = Date.now();
  private pending: DiscordActivityState | null = null;

  public async connect(): Promise<void> {
    if (!DISCORD_CLIENT_ID) return;
    if (this.client) return;
    try {
      const mod = await import("discord-rpc");
      const RPC = (mod as unknown as { Client?: typeof import("discord-rpc").Client; default?: { Client: typeof import("discord-rpc").Client } });
      const ClientCtor = RPC.Client ?? RPC.default?.Client;
      if (!ClientCtor) {
        console.warn("[discord-rpc] Client constructor missing from module:", Object.keys(mod));
        return;
      }
      this.client = new ClientCtor({ transport: "ipc" });
      console.log("[discord-rpc] client created, logging in...");
      this.client.on("ready", () => {
        this.ready = true;
        console.log("[discord-rpc] ready");
        if (this.pending) {
          const queued = this.pending;
          this.pending = null;
          this.setActivity(queued);
        } else {
          this.setIdle();
        }
      });
      await this.client.login({ clientId: DISCORD_CLIENT_ID });
    } catch (err) {
      console.warn("[discord-rpc] connect failed:", err);
      this.client = null;
    }
  }

  public setIdle(): void {
    this.setActivity({
      state: DISCORD_RPC_DEFAULTS.idleState,
      details: DISCORD_RPC_DEFAULTS.idleDetails,
      largeImageKey: DISCORD_RPC_DEFAULTS.largeImageKey,
      largeImageText: DISCORD_RPC_DEFAULTS.largeImageText
    });
  }

  public setActivity(activity: DiscordActivityState): void {
    if (!this.client) {
      this.pending = activity;
      return;
    }
    if (!this.ready) {
      this.pending = activity;
      return;
    }
    const payload: Record<string, unknown> = {
      state: activity.state,
      details: activity.details,
      startTimestamp: activity.startTimestamp ?? this.startedAt,
      instance: false
    };
    const largeKey = activity.largeImageKey ?? DISCORD_RPC_DEFAULTS.largeImageKey;
    if (largeKey) {
      payload.largeImageKey = largeKey;
      const largeText = activity.largeImageText ?? DISCORD_RPC_DEFAULTS.largeImageText;
      if (largeText) payload.largeImageText = largeText;
    }
    const smallKey = activity.smallImageKey ?? DISCORD_RPC_DEFAULTS.smallImageKey;
    if (smallKey) {
      payload.smallImageKey = smallKey;
      const smallText = activity.smallImageText ?? DISCORD_RPC_DEFAULTS.smallImageText;
      if (smallText) payload.smallImageText = smallText;
    }
    console.log("[discord-rpc] sending activity:", JSON.stringify(payload));
    this.client.setActivity(payload).catch((err: unknown) => console.warn("[discord-rpc] setActivity failed:", err));
  }

  public destroy(): void {
    if (!this.client) return;
    try { this.client.destroy(); } catch { /* ignore */ }
    this.client = null;
    this.ready = false;
  }
}
