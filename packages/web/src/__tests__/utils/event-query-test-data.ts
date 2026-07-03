import { type NormalizedEventQueryData } from "@web/ducks/events/queries/event.query.types";

/**
 * Builds the normalized `{ ids, entities }` shape the event query caches store,
 * from legacy Redux event fixtures. Events without an `_id` are skipped.
 * Shared by the store/render test harnesses so they seed the cache identically.
 */
export const toNormalizedEventQueryData = (
  events: Array<{ _id?: string }>,
): NormalizedEventQueryData => ({
  ids: events.flatMap((event) => (event._id ? [event._id] : [])),
  entities: Object.fromEntries(
    events.flatMap((event) => (event._id ? [[event._id, event]] : [])),
  ),
});
