import { ObjectId } from "mongodb";
import {
  mockSomedayRecurrences,
  newsletterId,
  userId,
} from "@core/__mocks__/v1/events/events.someday.recur";
import { Origin, Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { getDeleteByIdFilter } from "@backend/event/services/event.service.util";

describe("Delete Events", () => {
  beforeAll(setupTestDb);

  beforeEach(async () => {
    await mongoService.event.deleteMany({});
    await mongoService.event.insertMany(
      mockSomedayRecurrences.map((event) => ({
        ...event,
        _id: new ObjectId(event._id),
      })),
    );
  });

  afterAll(cleanupTestDb);

  describe("Recurring events: someday", () => {
    it("only deletes future instances", async () => {
      const today = dayjs();
      const instanceId = new ObjectId();

      const filter = getDeleteByIdFilter({
        _id: instanceId.toString(),
        user: userId,
        recurrence: { rule: ["foo"], eventId: newsletterId },
        startDate: today.format(YEAR_MONTH_DAY_FORMAT),
        endDate: today.add(6, "days").format(YEAR_MONTH_DAY_FORMAT),
        origin: Origin.COMPASS,
        priority: Priorities.SELF,
      });

      const { deletedCount } = await mongoService.event.deleteMany(filter);
      expect(deletedCount).not.toBe(0);

      const _events = await mongoService.event.find({ user: userId }).toArray();
      const events = _events.map((e) => e.title);

      expect(events.includes("Send Newsletter | Base | Past")).toBe(true);
      expect(
        events.includes("Send Newsletter | Instance2 | Starts Today"),
      ).toBe(true);
      expect(events.includes("Send Newsletter | Instance2 | Ends Today")).toBe(
        true,
      );
    });
  });
});
