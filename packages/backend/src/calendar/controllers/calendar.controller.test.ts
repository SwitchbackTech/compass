import { type SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { CalendarListResponseSchema } from "@core/types/calendar.contracts";
import { restoreFileMocks } from "@backend/__tests__/helpers/mock.setup";
import calendarController from "@backend/calendar/controllers/calendar.controller";
import calendarService from "@backend/calendar/services/calendar.service";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import { type Res_Promise } from "@backend/common/types/express.types";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// These exercise calendarController.availability directly against fake
// req/res objects (no supertest), mirroring events.controller.test.ts - the
// route itself is a one-line wire-up (calendar.routes.config.ts). The A7
// 62-day bound is enforced in the controller before any sync call, so it's
// pinned here independent of which service backs the request; happy-path
// sync-delegated behavior (per-calendar attribution, outage handling) is
// covered by calendar.controller.delegation.test.ts.

describe("CalendarController availability", () => {
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    restoreFileMocks();
  });

  const buildReq = (query: Record<string, string>): SessionRequest =>
    ({
      query,
      session: { getUserId: () => userId },
    }) as unknown as SessionRequest;

  const buildRes = () => {
    const promise = mock();
    return { promise } as unknown as Res_Promise;
  };

  it("rejects a range longer than 62 days with a 400, without querying sync (A7 bounded)", async () => {
    const clientSpy = spyOn(syncServiceFactory, "getSyncServiceClient");

    const req = buildReq({
      calendarIds: "507f1f77bcf86cd799439012",
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-05-01T00:00:00.000Z", // ~121 days, well past the 62-day bound
    });
    const res = buildRes();

    await calendarController.availability(req, res);

    expect(clientSpy).not.toHaveBeenCalled();
    expect(res.promise).toHaveBeenCalledTimes(1);

    const rejection = (res.promise as Mock).mock
      .calls[0]?.[0] as Promise<unknown>;
    await expect(rejection).rejects.toBeInstanceOf(BaseError);
    await rejection.catch((e) => {
      expect((e as BaseError).statusCode).toBe(Status.BAD_REQUEST);
      // `error()`'s second arg lands on `.result`, not `.message` (the first
      // arg's `.description` does) - see error.handler.ts.
      expect((e as BaseError).result).toMatch(/62 days/i);
    });

    clientSpy.mockRestore();
  });
});

// No prior test in this file exercised calendarController.list (GET
// /api/calendars) at all; this pins its happy path plus the packet 09 step 2
// response-boundary parse, using the same fake req/res driver as the
// describe block above.
describe("CalendarController list", () => {
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    restoreFileMocks();
  });

  it("returns a CalendarListResponse-shaped body for the session user's calendars", async () => {
    const listCalendars = mock(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          calendars: [
            {
              id: "507f1f77bcf86cd799439099",
              tenantId: userId,
              principalId: userId,
              connectionId: "507f1f77bcf86cd799439098",
              providerCalendarId: "gcal-1",
              displayName: "Work",
              color: "#000000",
              active: true,
              primary: true,
              accessRole: "owner" as const,
              capabilities: {
                canWriteEvents: true,
                canReadBusy: true,
                canInviteAttendees: true,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );
    const clientSpy = spyOn(
      syncServiceFactory,
      "getSyncServiceClient",
    ).mockReturnValue({ listCalendars } as never);
    // Not a .db.test.ts file, so there's no real Mongo connection here —
    // getLocalCalendar's own findOne would throw ("did you forget to call
    // `start`?") without this.
    const localCalendarSpy = spyOn(
      calendarService,
      "getLocalCalendar",
    ).mockResolvedValue(null);

    const req = {
      query: {},
      session: { getUserId: () => userId },
    } as unknown as SessionRequest;
    const promise = mock();
    const res = { promise } as unknown as Res_Promise;

    await calendarController.list(req, res);

    expect(listCalendars).toHaveBeenCalledTimes(1);
    expect(promise).toHaveBeenCalledTimes(1);

    const sentBody = promise.mock.calls[0]?.[0];
    expect(() => CalendarListResponseSchema.parse(sentBody)).not.toThrow();

    clientSpy.mockRestore();
    localCalendarSpy.mockRestore();
  });
});
