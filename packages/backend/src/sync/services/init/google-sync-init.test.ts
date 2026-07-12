import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { GoogleCalendarMetadataSchema } from "@core/types/calendar.types";
import { type gSchema$CalendarListEntry } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getCalendarsToSync } from "@backend/sync/services/init/google-sync-init";

describe("getCalendarsToSync", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("returns calendars to sync for a user", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());
    const result = await getCalendarsToSync(context);

    expect(result.gCalendarIds).toEqual(
      expect.arrayContaining(result.calendars.map((c) => c.id)),
    );

    expect(result.calendars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          primary: true,
        }),
      ]),
    );

    expect(
      result.calendars.map((calendar) =>
        GoogleCalendarMetadataSchema.safeParse(calendar),
      ),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ success: true })]),
    );

    expect(StringV4Schema.safeParse(result.nextSyncToken).success).toBe(true);
  });

  it("returns an empty list when the calendarlist has no entries", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    compassTestState().calendarlist = [];

    const result = await getCalendarsToSync(context);

    expect(result.calendars).toEqual([]);
    expect(result.gCalendarIds).toEqual([]);
    expect(result.nextPageToken).toBeUndefined();
    expect(StringV4Schema.safeParse(result.nextSyncToken).success).toBe(true);
  });

  it("paginates through many calendars and finds primary even when it isn't first or on the first page", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    // The test mock's calendarList.list pages 3 entries at a time, so 25
    // entries span 9 pages.
    const entries = Array.from({ length: 25 }, (_, i) =>
      createMockCalendarListEntry({ id: `calendar-${i}`, primary: false }),
    );
    entries[20] = createMockCalendarListEntry({
      id: "primary-calendar",
      primary: true,
    });

    compassTestState().calendarlist = entries;

    const result = await getCalendarsToSync(context);

    expect(result.calendars).toHaveLength(25);
    expect(result.gCalendarIds).toHaveLength(25);
    expect(result.calendars.filter((c) => c.primary === true)).toHaveLength(1);
    expect(result.nextPageToken).toBeUndefined();
    expect(StringV4Schema.safeParse(result.nextSyncToken).success).toBe(true);
  });

  it("filters out hidden and deleted entries but keeps non-primary, read-only, and unselected calendars", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    compassTestState().calendarlist = [
      createMockCalendarListEntry({ id: "primary", primary: true }),
      createMockCalendarListEntry({
        id: "hidden-cal",
        primary: false,
        hidden: true,
      }),
      createMockCalendarListEntry({
        id: "deleted-cal",
        primary: false,
        deleted: true,
      }),
      createMockCalendarListEntry({
        id: "readonly-unselected",
        primary: false,
        accessRole: "reader",
        selected: false,
      }),
      createMockCalendarListEntry({
        id: "freebusy-cal",
        primary: false,
        accessRole: "freeBusyReader",
      }),
    ];

    const result = await getCalendarsToSync(context);

    expect(result.gCalendarIds.sort()).toEqual(
      ["freebusy-cal", "primary", "readonly-unselected"].sort(),
    );
  });

  it("dedupes calendars with the same id, even across pages", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    // The test mock pages 3 at a time, so this spans 2 pages.
    compassTestState().calendarlist = [
      createMockCalendarListEntry({ id: "dup", primary: true }),
      createMockCalendarListEntry({ id: "dup", primary: true }),
      createMockCalendarListEntry({ id: "dup", primary: true }),
      createMockCalendarListEntry({ id: "dup", primary: true }),
    ];

    const result = await getCalendarsToSync(context);

    expect(result.calendars).toHaveLength(1);
    expect(result.gCalendarIds).toEqual(["dup"]);
  });

  it("throws when more than one calendar is marked primary", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    compassTestState().calendarlist = [
      createMockCalendarListEntry({ id: "cal-1", primary: true }),
      createMockCalendarListEntry({ id: "cal-2", primary: true }),
    ];

    await expect(getCalendarsToSync(context)).rejects.toThrow(/primary/i);
  });

  it("doesn't require id/etag/accessRole beyond what dedup and the primary check need", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());

    compassTestState().calendarlist = [
      createMockCalendarListEntry({ id: "primary", primary: true }),
      {
        id: "sparse-cal",
        // no etag, no accessRole, no summary - getCalendarsToSync (unlike
        // mapGoogleCalendar) shouldn't need these to include the entry.
      } as gSchema$CalendarListEntry,
    ];

    const result = await getCalendarsToSync(context);

    expect(result.gCalendarIds.sort()).toEqual(
      ["primary", "sparse-cal"].sort(),
    );
  });

  it("throws when nextSyncToken is invalid", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const context = await createGoogleRequestContext(user._id.toString());
    const getAllCalendarListPages =
      gcalService.getAllCalendarListPages.bind(gcalService);
    const getAllCalendarListPagesSpy = jest.spyOn(
      gcalService,
      "getAllCalendarListPages",
    );

    getAllCalendarListPagesSpy.mockImplementation(
      async function* (ctx, params) {
        for await (const page of getAllCalendarListPages(ctx, params)) {
          yield { ...page, nextSyncToken: "" };
        }
      },
    );

    await expect(getCalendarsToSync(context)).rejects.toThrow(
      /Failed to get Calendar\(list\)s to sync/,
    );
  });
});
