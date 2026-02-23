export type SplitTunnelMode = "disabled" | "include" | "exclude";

export class SplitTunnelModule {
  private mode: SplitTunnelMode = "disabled";
  private apps = new Set<string>();

  configure(mode: SplitTunnelMode, appIds: string[]): void {
    this.mode = mode;
    this.apps = new Set(appIds);
  }

  getMode(): SplitTunnelMode {
    return this.mode;
  }

  shouldRouteThroughVpn(appId: string): boolean {
    if (this.mode === "disabled") {
      return true;
    }

    if (this.mode === "include") {
      return this.apps.has(appId);
    }

    return !this.apps.has(appId);
  }
}
