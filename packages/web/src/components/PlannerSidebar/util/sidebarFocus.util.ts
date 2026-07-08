import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  DATA_EVENT_ELEMENT_ID,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";

const somedayItemSelector = (columnId: string) =>
  `#${columnId} [${DATA_EVENT_ELEMENT_ID}][role="button"]:not([aria-hidden="true"])`;

/**
 * Focuses the first someday event in the planner sidebar (week column first,
 * then month), falling back to the "Add item to week" button when both lists
 * are empty. Returns whether a focus target was found.
 */
export const focusFirstSomedaySidebarItem = (): boolean => {
  const sidebar = document.getElementById(ID_SIDEBAR);
  if (!sidebar) return false;

  const target =
    sidebar.querySelector<HTMLElement>(somedayItemSelector(COLUMN_WEEK)) ??
    sidebar.querySelector<HTMLElement>(somedayItemSelector(COLUMN_MONTH)) ??
    sidebar.querySelector<HTMLElement>('button[aria-label="Add item to week"]');

  target?.focus();
  return Boolean(target);
};
