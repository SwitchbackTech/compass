import { type GridEvent } from "@web/common/types/web.event.types";
import { isEventIdHidden } from "@web/events/hidden/hidden-event-id";

/**
 * Whether an event counts as visible on the week/day grid (full card), not a
 * hidden strip. Matches {@link createTimedEventLayout}, which excludes hidden
 * ids from overlap layout and only renders strips for hidden events.
 */
export function isEventVisibleOnGrid(
  event: Pick<GridEvent, "_id">,
  hiddenEventIds: ReadonlySet<string>,
): boolean {
  return !isEventIdHidden(event._id, hiddenEventIds);
}

/** Drop individually hidden events; calendar visibility is applied upstream. */
export function filterEventsVisibleOnGrid<T extends Pick<GridEvent, "_id">>(
  events: readonly T[],
  hiddenEventIds: ReadonlySet<string>,
): T[] {
  return events.filter((event) => isEventVisibleOnGrid(event, hiddenEventIds));
}
