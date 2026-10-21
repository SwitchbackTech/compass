import { type QueryClient } from "@tanstack/react-query";
import { type Calendar } from "@core/types/calendar.contracts";
import { type EventId } from "@core/types/domain-primitives";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { findEventInCache } from "@web/events/queries/event.query.cache";

const LINKED_PROVIDERS = new Set<ProviderKind>([
  "google",
  "microsoft",
  "apple",
]);

function providerForCalendar(
  calendars: Calendar[] | undefined,
  calendarId: string | undefined,
): ProviderKind | undefined {
  if (!calendarId || !calendars) return undefined;
  const calendar = calendars.find((entry) => entry.id === calendarId);
  if (!calendar || calendar.provider === "local") return undefined;
  return LINKED_PROVIDERS.has(calendar.provider)
    ? calendar.provider
    : undefined;
}

/** Calendar id on a create/replace payload, when the mutation carried one. */
export function calendarIdFromMutationInput(
  input: unknown,
): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  if (!("calendarId" in input)) return undefined;
  const calendarId = (input as { calendarId?: unknown }).calendarId;
  return typeof calendarId === "string" ? calendarId : undefined;
}

/** Provider for an in-flight mutation when the API error omitted it. */
export function resolveMutationProvider(
  queryClient: QueryClient,
  payload: {
    writeKey: EventId;
    calendarId?: string;
  },
): ProviderKind | undefined {
  const calendars = queryClient.getQueryData<Calendar[]>(calendarQueryKeys.all);
  const fromHint = providerForCalendar(calendars, payload.calendarId);
  if (fromHint) return fromHint;

  const cached = findEventInCache(queryClient, payload.writeKey);
  return providerForCalendar(calendars, cached?.calendarId);
}
