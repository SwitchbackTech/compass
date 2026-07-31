import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";

// A calendar's custom event-color labels (Google's post-June-2026 event
// labels, or any future provider's equivalent), as an id -> hex lookup for
// resolving one event's providerEventLabelId during normalization.
export function toColorLabelMap(
  eventLabels: ProviderCalendarRecord["eventLabels"],
): ReadonlyMap<string, string> {
  return new Map(eventLabels.map((label) => [label.id, label.hex]));
}
