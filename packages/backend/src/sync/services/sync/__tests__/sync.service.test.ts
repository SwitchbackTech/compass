import { GoogleCalendarMetadataSchema } from "@core/types/calendar.types";
import { gCalendar } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import syncService from "@backend/sync/services/sync.service";

describe("SyncService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("getCalendarsToSync", () => {
    it("returns calendars to sync for a user", async () => {
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);
      const result = await syncService.getCalendarsToSync(gcal);

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
      const user = await AuthDriver.googleSignup();
      const gcal = await getGcalClient(user._id);
      const getCalendarlist = gcalService.getCalendarlist.bind(gcalService);
      const getCalendarlistSpy = jest.spyOn(gcalService, "getCalendarlist");

      getCalendarlistSpy.mockImplementation(async (gcal: gCalendar) =>
        getCalendarlist(gcal).then((res) => ({
          ...res,
          nextSyncToken: "",
        })),
      );

      await expect(syncService.getCalendarsToSync(gcal)).rejects.toThrow(
        /Failed to get all the calendars to sync. No nextSyncToken/,
      );
    });
  });
});
