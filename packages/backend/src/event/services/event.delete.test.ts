import dayjs from "dayjs";
import { Collection, ObjectId } from "mongodb";
import {
  mockSomedayRecurrences,
  newsletterId,
} from "@core/__mocks__/v1/events/events.someday.recur";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { getDeleteByIdFilter } from "@backend/event/services/event.service.util";

describe("Delete Events", () => {
  let eventCollection: Collection<Schema_Event>;

  beforeAll(async () => {
    await setupTestDb();

    eventCollection = mongoService.db.collection("event.delete.test");
  });

  beforeEach(async () => {
    await eventCollection.deleteMany({});
    await eventCollection.insertMany([...mockSomedayRecurrences]);
  });

  afterAll(cleanupTestDb);

  describe("Recurring events: someday", () => {
    it("only deletes future instances", async () => {
      const today = dayjs();
      const instanceId = new ObjectId();

      const filter = getDeleteByIdFilter({
        _id: instanceId,
        user: "user1",
        recurrence: { rule: ["foo"], eventId: newsletterId },
        startDate: today.format(YEAR_MONTH_DAY_FORMAT),
        endDate: today.add(6, "days").format(YEAR_MONTH_DAY_FORMAT),
      });

      const { deletedCount } = await eventCollection.deleteMany(filter);
      expect(deletedCount).not.toBe(0);

      const _events = await eventCollection.find({ user: "user1" }).toArray();
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
