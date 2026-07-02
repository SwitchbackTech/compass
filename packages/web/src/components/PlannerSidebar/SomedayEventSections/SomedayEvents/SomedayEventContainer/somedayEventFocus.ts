import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";

/**
 * Coordinates keyboard focus across a someday-event migration.
 *
 * Migrating a someday event between the week and month columns unmounts its row
 * in the source column and mounts a fresh row in the destination column, which
 * drops keyboard focus. To keep chained migrations working, the source row
 * records the event id here, and the freshly mounted destination row consumes
 * it (once) to restore focus.
 */
let pendingFocusEventId: string | null = null;

export const requestSomedayEventFocus = (eventId: string) => {
  pendingFocusEventId = eventId;
};

/**
 * Focuses the migrated event's row if it is the one awaiting focus. Returns
 * whether focus was claimed so callers only act on the matching row.
 */
export const consumeSomedayEventFocus = (eventId: string) => {
  if (pendingFocusEventId !== eventId) return false;

  pendingFocusEventId = null;

  const element = document.querySelector<HTMLElement>(
    `[${DATA_EVENT_ELEMENT_ID}="${eventId}"]`,
  );
  element?.focus();

  return true;
};
