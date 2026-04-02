import { ObjectId } from "mongodb";
import {
  CompassEventStatus,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass/compass.sync.processor";
import eventController from "./event.controller";

describe("EventController", () => {
  it("normalizes recurrence null on update payload", async () => {
    const userId = new ObjectId().toString();
    const eventId = new ObjectId().toString();
    const processEventsSpy = jest
      .spyOn(CompassSyncProcessor, "processEvents")
      .mockResolvedValue([]);
    let trackedPromise: Promise<{ statusCode: number }> | undefined;
    const req = {
      body: {
        title: "updated title",
        startDate: "2026-04-02",
        endDate: "2026-04-03",
        origin: "compass",
        priority: "unassigned",
        recurrence: null,
      },
      query: {},
      params: { id: eventId },
      session: {
        getUserId: () => userId,
      },
    };
    const res: {
      promise: jest.Mock<
        { promise: typeof res.promise },
        [Promise<{ statusCode: number }>]
      >;
    } = {
      promise: jest.fn((promise: Promise<{ statusCode: number }>) => {
        trackedPromise = promise;
        return res;
      }),
    };

    eventController.update(req as never, res as never);

    expect(res.promise).toHaveBeenCalled();
    expect(trackedPromise).toBeDefined();
    await trackedPromise;

    expect(processEventsSpy).toHaveBeenCalledTimes(1);
    type ProcessEventsCall = Array<{
      status: CompassEventStatus;
      applyTo: RecurringEventUpdateScope;
      payload: { _id: string; user: string; recurrence?: { rule: null } };
    }>;
    const [processedEvents] = processEventsSpy.mock.calls[0] as [
      ProcessEventsCall,
    ];
    const processedEvent = processedEvents[0];

    expect(processedEvent?.status).toBe(CompassEventStatus.CONFIRMED);
    expect(processedEvent?.applyTo).toBe(RecurringEventUpdateScope.THIS_EVENT);
    expect(processedEvent?.payload._id).toBe(eventId);
    expect(processedEvent?.payload.user).toBe(userId);
    expect(processedEvent?.payload.recurrence).toEqual({ rule: null });

    processEventsSpy.mockRestore();
  });
});
