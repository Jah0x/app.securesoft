import type { AppRoute } from "./coreMvp.js";

export interface StackScreen {
  route: AppRoute;
  title: string;
}

export interface TabScreen {
  route: Exclude<AppRoute, "Auth">;
  icon: string;
}

export interface NavigationConfig {
  stack: StackScreen[];
  tabs: TabScreen[];
}

export const CORE_NAVIGATION_CONFIG: NavigationConfig = {
  stack: [
    { route: "Auth", title: "Authentication" },
    { route: "MainVpn", title: "VPN" },
    { route: "Status", title: "Status" },
    { route: "Notifications", title: "Notifications" },
    { route: "Accounts", title: "Accounts" },
  ],
  tabs: [
    { route: "MainVpn", icon: "shield" },
    { route: "Status", icon: "activity" },
    { route: "Notifications", icon: "bell" },
    { route: "Accounts", icon: "users" },
  ],
};

export type AppFsmState = "Idle" | "Authenticating" | "Connected" | "Reconnecting" | "Error";

export const FSM_TRANSITIONS: Record<AppFsmState, AppFsmState[]> = {
  Idle: ["Authenticating"],
  Authenticating: ["Connected", "Error"],
  Connected: ["Reconnecting", "Error", "Idle"],
  Reconnecting: ["Connected", "Error", "Idle"],
  Error: ["Idle", "Authenticating"],
};

export const isTransitionAllowed = (from: AppFsmState, to: AppFsmState): boolean =>
  FSM_TRANSITIONS[from].includes(to);
