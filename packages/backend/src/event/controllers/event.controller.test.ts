import { ObjectId } from "mongodb";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { type Schema_Event } from "@core/types/event.types";
import { type Res_Promise } from "@backend/common/types/express.types";
import eventController from "@backend/event/controllers/event.controller";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass/compass.sync.processor";

describe("EventController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function buildUpdateRequest(body: Schema_Event) {
    return {
      body,
      query: {},
      params: { id: body._id as string },
      session: {
        getUserId: () => "user-1",
      },
    } as unknown as Parameters<typeof eventController.update>[0];
  }

  function buildResponse() {
    let capturedPromise: Promise<unknown> | undefined;
    const response = {
      promise: jest.fn((promiseLike: unknown) => {
        capturedPromise = promiseLike as Promise<unknown>;
        return response as unknown as Res_Promise;
      }),
    } as unknown as Res_Promise;

    return {
      response,
      getCapturedPromise: () => capturedPromise,
    };
  }

  it("normalizes null recurrence before schema parsing", async () => {
    const processEventsSpy = jest
      .spyOn(CompassSyncProcessor, "processEvents")
      .mockResolvedValue([]);

    const id = new ObjectId().toString();
    const request = buildUpdateRequest({
      _id: id,
      endDate: "2026-03-30T11:00:00.000Z",
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      recurrence: null as unknown as { rule?: string[]; eventId?: string },
      startDate: "2026-03-30T10:00:00.000Z",
    });
    const { response, getCapturedPromise } = buildResponse();

    eventController.update(request, response);
    await getCapturedPromise();

    expect(response.promise).toHaveBeenCalledTimes(1);
    expect(processEventsSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        applyTo: "This Event",
        status: "CONFIRMED",
        payload: expect.objectContaining({
          _id: id,
          recurrence: undefined,
          user: "user-1",
        }),
      }),
    ]);
  });

  it("returns no content when update payload is valid", async () => {
    jest.spyOn(CompassSyncProcessor, "processEvents").mockResolvedValue([]);

    const request = buildUpdateRequest({
      _id: new ObjectId().toString(),
      endDate: "2026-03-30T11:00:00.000Z",
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      recurrence: { rule: null as unknown as string[] },
      startDate: "2026-03-30T10:00:00.000Z",
    });
    const { response, getCapturedPromise } = buildResponse();

    eventController.update(request, response);
    const result = (await getCapturedPromise()) as { statusCode: number };

    expect(result).toEqual({ statusCode: Status.NO_CONTENT });
  });
});
