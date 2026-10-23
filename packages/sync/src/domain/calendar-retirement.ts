import { type ProviderCalendarId } from "@core/types/sync/identity.contracts";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface CalendarRetirementDeps {
  calendars: ProviderCalendarRepository;
  resources: SyncResourceRepository;
  log?: { warn: (message: string) => void };
}

// Detail string stamped by googleFailureCause / ProviderEventReadError settlement.
export function isEventsCalendarNotFoundDetail(detail: string): boolean {
  return detail.includes("HTTP 404") && detail.includes("notFound");
}

// Mirror calendar-list-sync's inactive pass: clear local push-channel fields and
// stamp calendarActive false on events resources so sweeps stop enqueueing pulls.
export async function applyInactiveCalendarSideEffects(
  resources: SyncResourceRepository,
  tenantId: Parameters<
    SyncResourceRepository["setCalendarActiveByCalendarIds"]
  >[0],
  principalId: Parameters<
    SyncResourceRepository["setCalendarActiveByCalendarIds"]
  >[1],
  calendarIds: readonly ProviderCalendarId[],
): Promise<void> {
  if (calendarIds.length === 0) return;
  await resources.clearSubscriptionsByCalendarIds(
    tenantId,
    principalId,
    calendarIds,
  );
  await resources.setCalendarActiveByCalendarIds(
    tenantId,
    principalId,
    calendarIds,
    false,
  );
}

// Mark provider calendars inactive and apply the resource side effects discovery
// uses when a calendar is absent or reported deleted.
export async function retireProviderCalendars(
  deps: CalendarRetirementDeps,
  tenantId: Parameters<ProviderCalendarRepository["deactivateByIds"]>[0],
  principalId: Parameters<ProviderCalendarRepository["deactivateByIds"]>[1],
  calendarIds: readonly ProviderCalendarId[],
  logMessage?: string,
): Promise<ProviderCalendarId[]> {
  const retired = await deps.calendars.deactivateByIds(
    tenantId,
    principalId,
    calendarIds,
  );
  if (retired.length === 0) return [];
  await applyInactiveCalendarSideEffects(
    deps.resources,
    tenantId,
    principalId,
    retired,
  );
  if (logMessage) deps.log?.warn(logMessage);
  return retired;
}
