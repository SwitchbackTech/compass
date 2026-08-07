import { faker } from "@faker-js/faker";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();

type CalendarUpsertInput = Parameters<
  ProviderCalendarRepository["upsertByProviderCalendar"]
>[0];

// One writable, active, primary Google calendar under a fresh owner — the
// shape most db tests hand-rolled locally. Override any field; overriding
// tenantId/principalId/connectionId groups several calendars under one owner.
export const seedProviderCalendar = (
  calendars: ProviderCalendarRepository,
  overrides: Partial<CalendarUpsertInput> = {},
): Promise<ProviderCalendarRecord> =>
  calendars.upsertByProviderCalendar({
    tenantId: objectId() as ProviderCalendarRecord["tenantId"],
    principalId: objectId() as ProviderCalendarRecord["principalId"],
    connectionId: objectId() as ProviderCalendarRecord["connectionId"],
    providerCalendarId: "primary@google.com",
    displayName: "Google",
    color: null,
    active: true,
    primary: true,
    accessRole: "owner",
    capabilities: {
      canReadEvents: true,
      canWriteEvents: true,
      canReadBusy: true,
      canInviteAttendees: true,
    },
    ...overrides,
  });

// Ensure the calendar's events resource, optionally already imported (holding
// a cursor), as a prior import/pull would have left it. A seeded cursor
// represents an established calendar from before the test's job begins, so it
// also marks the bootstrap ready unless the caller overrides that; tests that
// exercise the bootstrap lifecycle seed without a cursor.
export const ensureEventsResource = async (
  resources: SyncResourceRepository,
  calendar: Pick<
    ProviderCalendarRecord,
    "_id" | "tenantId" | "principalId" | "connectionId"
  >,
  options: {
    cursor?: string | null;
    bootstrapState?: SyncResourceRecord["bootstrapState"];
    now?: () => Date;
  } = {},
): Promise<SyncResourceRecord> => {
  const resource = await resources.ensure({
    tenantId: calendar.tenantId,
    principalId: calendar.principalId,
    connectionId: calendar.connectionId,
    resourceKind: "events",
    calendarId: calendar._id,
  });
  if (options.cursor) {
    await resources.advanceCursor(
      calendar.tenantId,
      calendar.principalId,
      resource._id,
      options.cursor,
      (options.now ?? (() => new Date()))(),
    );
  }
  const bootstrapState =
    options.bootstrapState ?? (options.cursor ? "ready" : undefined);
  if (bootstrapState) {
    await resources.setBootstrapState(
      calendar.tenantId,
      calendar.principalId,
      resource._id,
      bootstrapState,
    );
  }
  const seeded = await resources.findById(
    calendar.tenantId,
    calendar.principalId,
    resource._id,
  );
  if (!seeded) throw new Error("seeded resource vanished");
  return seeded;
};
