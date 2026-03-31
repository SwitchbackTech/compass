import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass/compass.sync.processor";

describe("EventController", () => {
  const baseDriver = new BaseDriver();

  beforeAll(async () => {
    await setupTestDb();
    await baseDriver.listen();
  });

  beforeEach(async () => {
    await cleanupCollections();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  it("accepts recurrence as null on create requests", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const syncSpy = jest
      .spyOn(CompassSyncProcessor, "processEvents")
      .mockResolvedValue([]);
    const event = createMockStandaloneEvent({
      user: userId,
      _id: new ObjectId().toString(),
    });

    await baseDriver
      .getServer()
      .post("/api/event")
      .use(baseDriver.setSessionPlugin({ userId }))
      .send({ ...event, recurrence: null })
      .expect(Status.NO_CONTENT);

    expect(syncSpy).toHaveBeenCalledTimes(1);

    const parsedEvent = syncSpy.mock.calls[0]?.[0]?.[0];

    expect(parsedEvent).toEqual(
      expect.objectContaining({
        status: "CONFIRMED",
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    expect(parsedEvent?.payload.recurrence).toBeUndefined();
  });

  it("accepts recurrence as null on update requests", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const syncSpy = jest
      .spyOn(CompassSyncProcessor, "processEvents")
      .mockResolvedValue([]);
    const event = createMockStandaloneEvent({
      user: userId,
      _id: new ObjectId().toString(),
    });
    const eventId = new ObjectId().toString();

    await baseDriver
      .getServer()
      .put(`/api/event/${eventId}`)
      .use(baseDriver.setSessionPlugin({ userId }))
      .send({ ...event, recurrence: null })
      .expect(Status.NO_CONTENT);

    expect(syncSpy).toHaveBeenCalledTimes(1);

    const parsedEvent = syncSpy.mock.calls[0]?.[0]?.[0];

    expect(parsedEvent).toEqual(
      expect.objectContaining({
        status: "CONFIRMED",
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    expect(parsedEvent?.payload._id).toBe(eventId);
    expect(parsedEvent?.payload.recurrence).toBeUndefined();
  });
});
