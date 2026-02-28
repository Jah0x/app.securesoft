import type { AppRoute } from "./coreMvp.js";

const DEEP_LINK_TO_ROUTE: Record<string, AppRoute> = {
  "app://vpn": "MainVpn",
  "app://status": "Status",
  "app://notifications": "Notifications",
  "app://inbox": "Notifications",
  "app://accounts": "Accounts",
};

const normalizeDeepLink = (deepLink: string): string => {
  const [withoutFragment] = deepLink.split("#", 1);
  const [withoutQuery] = withoutFragment.split("?", 1);
  return withoutQuery.trim().toLowerCase().replace(/\/$/, "");
};

export const resolveDeepLinkRoute = (deepLink?: string | null): AppRoute | null => {
  if (!deepLink) {
    return null;
  }

  return DEEP_LINK_TO_ROUTE[normalizeDeepLink(deepLink)] ?? null;
};

