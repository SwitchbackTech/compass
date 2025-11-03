import { Categories_Recurrence, EventSchema } from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createNewRecurringEventPayload } from "@backend/__tests__/mocks.gcal/fixtures/recurring/create/create";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { GcalEventParser } from "@backend/event/classes/gcal.event.parser";

describe("GcalEventParser", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("Before Init", () => {
    it("should be called before accessing these public members", async () => {
      const events = createNewRecurringEventPayload.items ?? [];
      const payload = events[0] as WithGcalId<gSchema$Event>;
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const parser = new GcalEventParser({ calendar, payload });
      const developerError = GenericError.DeveloperError.description;

      expect(() => parser.category).toThrow(developerError);
      expect(() => parser.isBase).toThrow(developerError);
      expect(() => parser.isCompassBase).toThrow(developerError);
      expect(() => parser.isCompassInstance).toThrow(developerError);
      expect(() => parser.isCompassStandalone).toThrow(developerError);
      expect(() => parser.isInstance).toThrow(developerError);
      expect(() => parser.isRegular).toThrow(developerError);
      expect(() => parser.event).toThrow(developerError);
      expect(() => parser.transition).toThrow(developerError);
    });
  });

  describe("Init", () => {
    it("should initialize these members after init", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const events = createNewRecurringEventPayload.items ?? [];
      const payload = events[0] as WithGcalId<gSchema$Event>;

      const parser = new GcalEventParser({ calendar, payload });
      const developerError = GenericError.DeveloperError.description;
      const status = payload.status;

      await parser.init();

      expect(() => parser.category).not.toThrow(developerError);
      expect(() => parser.isBase).not.toThrow(developerError);
      expect(() => parser.isCompassBase).not.toThrow(developerError);
      expect(() => parser.isCompassInstance).not.toThrow(developerError);
      expect(() => parser.isCompassStandalone).not.toThrow(developerError);
      expect(() => parser.isInstance).not.toThrow(developerError);
      expect(() => parser.isRegular).not.toThrow(developerError);
      expect(() => parser.event).not.toThrow(developerError);
      expect(() => parser.transition).not.toThrow(developerError);

      expect([
        Categories_Recurrence.RECURRENCE_BASE,
        Categories_Recurrence.RECURRENCE_INSTANCE,
        Categories_Recurrence.REGULAR,
      ]).toContain(parser.category);

      expect([
        parser.isBase,
        parser.isCompassBase,
        parser.isCompassInstance,
        parser.isCompassStandalone,
        parser.isInstance,
        parser.isRegular,
      ]).toContain(true);

      expect(EventSchema.safeParse(parser.event).success).toBe(true);

      expect(parser.getTransitionString()).toStrictEqual(
        `NIL->>${parser.category}_${status}`,
      );
    });
  });
});
