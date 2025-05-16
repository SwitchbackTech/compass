import dayjs from "dayjs";
import { Collection, Db, MongoClient, ObjectId } from "mongodb";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import {
  mockSomedayRecurrences,
  newsletterId,
} from "../../../../core/src/__mocks__/v1/events/events.someday.recur";
import { getDeleteByIdFilter } from "./event.service.util";

describe("Delete Events", () => {
  let connection: MongoClient;
  let db: Db;
  let eventCollection: Collection<Schema_Event>;

  beforeAll(async () => {
    // setup in-memory connection using jest-mongodb
    connection = await MongoClient.connect(process.env["MONGO_URL"] as string);
    db = await connection.db();
    eventCollection = db.collection("event.delete.test");
  });

  beforeEach(async () => {
    await eventCollection.deleteMany({});
    await eventCollection.insertMany([...mockSomedayRecurrences]);
  });

  afterAll(async () => {
    await connection.close();
  });

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
