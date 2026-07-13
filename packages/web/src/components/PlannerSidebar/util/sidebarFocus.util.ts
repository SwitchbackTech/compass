import { ID_SIDEBAR } from "@web/common/constants/web.constants";

/**
 * Focuses the first interactive element in the planner sidebar (the month
 * picker). Used by the Day and Week views' "u" shortcut. Returns whether a
 * focus target was found.
 */
export const focusFirstSidebarItem = (): boolean => {
  const sidebar = document.getElementById(ID_SIDEBAR);
  if (!sidebar) return false;

  const target = sidebar.querySelector<HTMLElement>(
    'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );
  target?.focus();
  return Boolean(target);
};
