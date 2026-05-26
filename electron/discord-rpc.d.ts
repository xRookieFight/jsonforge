declare module "discord-rpc" {
  export interface ClientOptions {
    transport: "ipc" | "websocket";
  }
  export interface LoginOptions {
    clientId: string;
    clientSecret?: string;
    accessToken?: string;
    rpcToken?: string;
    tokenEndpoint?: string;
    scopes?: string[];
  }
  export class Client {
    public constructor(options: ClientOptions);
    public login(options: LoginOptions): Promise<Client>;
    public setActivity(activity: Record<string, unknown>): Promise<unknown>;
    public destroy(): Promise<void>;
    public on(event: "ready", listener: () => void): this;
    public on(event: string, listener: (...args: unknown[]) => void): this;
  }
}
