import { ObjectId } from "mongodb";
import { Origin, Priorities } from "@core/constants/core.constants";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import * as eventServiceModule from "@backend/event/services/event.service";
import compassToGoogleBackfill from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google-backfill";

const createEvent = (user: string, overrides = {}) => ({
  _id: new ObjectId(),
  user,
  title: "Compass event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  ...overrides,
});

describe("compassToGoogleBackfill", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("creates a Google event for Compass-owned events without provider ids", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const event = createEvent(userId);
    await mongoService.event.insertOne(event);
    jest.spyOn(eventServiceModule, "_createGcal").mockResolvedValue({
      id: "google-event-id",
    } as never);

    await expect(
      compassToGoogleBackfill.syncCompassEventsToGoogle(userId),
    ).resolves.toBe(1);

    expect(await mongoService.event.findOne({ _id: event._id })).toEqual(
      expect.objectContaining({ gEventId: "google-event-id" }),
    );
  });

  it("ignores someday events and events that already have Google ids", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    await mongoService.event.insertMany([
      createEvent(userId, { isSomeday: true }),
      createEvent(userId, { gEventId: "existing-google-id" }),
    ]);
    const createSpy = jest.spyOn(eventServiceModule, "_createGcal");

    await expect(
      compassToGoogleBackfill.syncCompassEventsToGoogle(userId),
    ).resolves.toBe(0);

    expect(createSpy).not.toHaveBeenCalled();
  });
});
