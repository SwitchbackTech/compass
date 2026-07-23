import { type Response } from "express";
import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import { EventListResponseSchema } from "@core/types/event-command.contracts";
import { restoreFileMocks } from "@backend/__tests__/helpers/mock.setup";
import eventController from "@backend/event/controllers/event.controller";
import eventService from "@backend/event/services/event.service";
import { buildEventRecord } from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// No prior test file existed for event.controller.ts. This mirrors the fake
// req/res driver already established in calendar.controller.test.ts (no
// supertest, no DB - the route wire-up is a one-line
// event.routes.config.ts, and eventService's own query/ownership behavior is
// covered in event.service.test.ts). Packet 09 step 2: pins the
// response-boundary shape of GET /api/event against the shared core schema.
describe("EventController readAll", () => {
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    restoreFileMocks();
  });

  it("returns an EventListResponse-shaped body for a range query", async () => {
    const record = buildEventRecord(new ObjectId());
    const readAllSpy = spyOn(eventService, "readAll").mockResolvedValue([
      record,
    ]);

    const req = {
      query: {
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
      },
      session: { getUserId: () => userId },
    } as unknown as SessionRequest;
    const json = mock();
    const res = {
      status: mock().mockReturnThis(),
      json,
    } as unknown as Response;

    await eventController.readAll(req, res);

    expect(readAllSpy).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ kind: "range" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);

    const sentBody = json.mock.calls[0]?.[0] as unknown;
    expect(() => EventListResponseSchema.parse(sentBody)).not.toThrow();
  });
});
