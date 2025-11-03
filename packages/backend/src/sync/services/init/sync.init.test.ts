import { GoogleCalendarMetadataSchema } from "@core/types/calendar.types";
import { gCalendar } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getCalendarsToSync } from "@backend/sync/services/init/sync.init";

describe("getCalendarsToSync", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("returns calendars to sync for a user", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const gcal = await getGcalClient(user._id.toString());
    const result = await getCalendarsToSync(gcal);

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

  it("throws when nextSyncToken is invalid", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const gcal = await getGcalClient(user._id.toString());
    const getCalendarlist = gcalService.getCalendarlist.bind(gcalService);
    const getCalendarlistSpy = jest.spyOn(gcalService, "getCalendarlist");

    getCalendarlistSpy.mockImplementation(async (gcal: gCalendar) =>
      getCalendarlist(gcal).then((res) => ({
        ...res,
        nextSyncToken: "",
      })),
    );

    await expect(getCalendarsToSync(gcal)).rejects.toThrow(
      /Failed to get Calendar\(list\)s to sync/,
    );
  });
});
