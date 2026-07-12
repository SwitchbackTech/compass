import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { type AvailabilityResponse } from "@core/types/event-command.contracts";
import calendarController from "@backend/calendar/controllers/calendar.controller";
import calendarService from "@backend/calendar/services/calendar.service";
import { type Res_Promise } from "@backend/common/types/express.types";

// These exercise calendarController.availability directly against fake
// req/res objects (no supertest), mirroring events.controller.test.ts - the
// route itself is a one-line wire-up (calendar.routes.config.ts) and the
// business logic under test (query parsing, the A7 62-day bound,
// ownership/visibility) belongs to the controller and calendarService
// respectively. calendarService.getAvailability's own owned/visible/
// freeBusyReader/google-error behavior is covered in calendar.service.test.ts;
// this file only pins the controller's request-shape parsing and its
// backend-only range bound.

describe("CalendarController availability", () => {
  const userId = "507f1f77bcf86cd799439011";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildReq = (query: Record<string, string>): SessionRequest =>
    ({
      query,
      session: { getUserId: () => userId },
    }) as unknown as SessionRequest;

  const buildRes = () => {
    const promise = jest.fn();
    return { promise } as unknown as Res_Promise;
  };

  it("parses comma-separated calendarIds and forwards start/end to calendarService.getAvailability", async () => {
    const availabilityResponse: AvailabilityResponse = { busyPeriods: [] };
    const getAvailabilitySpy = jest
      .spyOn(calendarService, "getAvailability")
      .mockResolvedValue(availabilityResponse);

    const req = buildReq({
      calendarIds: "507f1f77bcf86cd799439012,507f1f77bcf86cd799439013",
      start: "2024-01-15T00:00:00.000Z",
      end: "2024-01-16T00:00:00.000Z",
    });
    const res = buildRes();

    await calendarController.availability(req, res);

    expect(getAvailabilitySpy).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.objectContaining({
        calendarIds: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      }),
    );
    expect(res.promise).toHaveBeenCalledWith(availabilityResponse);
  });

  it("rejects a range longer than 62 days with a 400, without calling calendarService.getAvailability (A7 bounded)", async () => {
    const getAvailabilitySpy = jest.spyOn(calendarService, "getAvailability");

    const req = buildReq({
      calendarIds: "507f1f77bcf86cd799439012",
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-05-01T00:00:00.000Z", // ~121 days, well past the 62-day bound
    });
    const res = buildRes();

    await calendarController.availability(req, res);

    expect(getAvailabilitySpy).not.toHaveBeenCalled();
    expect(res.promise).toHaveBeenCalledTimes(1);

    const rejection = (res.promise as jest.Mock).mock
      .calls[0]?.[0] as Promise<unknown>;
    await expect(rejection).rejects.toBeInstanceOf(BaseError);
    await rejection.catch((e) => {
      expect((e as BaseError).statusCode).toBe(Status.BAD_REQUEST);
      // `error()`'s second arg lands on `.result`, not `.message` (the first
      // arg's `.description` does) - see error.handler.ts.
      expect((e as BaseError).result).toMatch(/62 days/i);
    });
  });
});
