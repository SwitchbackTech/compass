import { ROOT_ROUTES } from "./routes";

/**
 * View navigation shortcuts mapping.
 * Single source of truth for keyboard shortcuts used to navigate between views.
 */
export const VIEW_SHORTCUTS = {
  now: { key: "n", label: "Now", route: ROOT_ROUTES.NOW },
  day: { key: "d", label: "Day", route: ROOT_ROUTES.DAY },
  week: { key: "w", label: "Week", route: ROOT_ROUTES.WEEK },
} as const;

export type ViewName = keyof typeof VIEW_SHORTCUTS;
