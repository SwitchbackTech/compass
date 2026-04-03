import { apps } from "open";
import type { SupportedBrowser } from "./delete.types";

export const BROWSER_MAP: Record<SupportedBrowser, string | readonly string[]> =
  {
    chrome: apps.chrome,
    firefox: apps.firefox,
    brave: apps.brave,
    edge: apps.edge,
    safari: "safari",
  };
