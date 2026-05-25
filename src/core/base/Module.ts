export interface Module {
  getName(): string;
  onRegister?(): void;
  onUnregister?(): void;
}
