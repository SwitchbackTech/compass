/**
 * @jest-environment node
 *
 * we do not need the database for this test
 */

import { ObjectId } from "mongodb";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";

jest.mock("supertokens-node/recipe/session/framework/express", () => ({
  verifySession:
    () =>
    (
      req: { headers?: { cookie?: string }; session?: unknown },
      _res: unknown,
      next: () => void,
    ) => {
      const cookieHeader = req.headers?.cookie ?? "";
      const sessionMatch = cookieHeader.match(/session=([^;]+)/);
      if (sessionMatch) {
        try {
          const session = JSON.parse(decodeURIComponent(sessionMatch[1])) as {
            userId: string;
          };
          req.session = {
            getUserId: () => session.userId,
            getHandle: () => "test-session-handle",
          };
        } catch {
          // ignore invalid cookie
        }
      }
      next();
    },
}));

jest.mock("@backend/user/services/user-metadata.service", () => ({
  __esModule: true,
  default: {
    fetchUserMetadata: jest.fn().mockResolvedValue({
      sync: { importGCal: null },
    }),
  },
}));

describe("SSE Server", () => {
  const baseDriver = new BaseDriver();

  beforeAll(async () => {
    await baseDriver.listen();
  });

  afterAll(async () => baseDriver.teardown());

  describe("Subscription and events (B10 — single `message` event, dispatched by payload.type):", () => {
    it("delivers eventsChanged to a subscribed user", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });
      await stream.waitForEvent("userMetadataChanged", 2000);

      const eventPromise = stream.waitForEvent("eventsChanged", 2000);

      const { sseServer } = await import("./sse.server");
      sseServer.publishEventsChanged(userId, {
        calendarId: new ObjectId().toHexString() as CalendarId,
        eventIds: [new ObjectId().toHexString() as EventId],
        reason: "updated",
      });

      await expect(eventPromise).resolves.toMatchObject({
        type: "eventsChanged",
        reason: "updated",
      });

      stream.close();
    });

    it("delivers calendarsChanged to a subscribed user", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });
      await stream.waitForEvent("userMetadataChanged", 2000);

      const eventPromise = stream.waitForEvent("calendarsChanged", 2000);

      const { sseServer } = await import("./sse.server");
      sseServer.publishCalendarsChanged(userId, [
        new ObjectId().toHexString() as CalendarId,
      ]);

      await expect(eventPromise).resolves.toMatchObject({
        type: "calendarsChanged",
      });

      stream.close();
    });

    it("replays userMetadataChanged on connection (cold start)", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });

      await expect(
        stream.waitForEvent("userMetadataChanged", 2000),
      ).resolves.toMatchObject({ type: "userMetadataChanged" });

      stream.close();
    });

    it("does not replay userMetadataChanged to existing tabs when a new tab opens", async () => {
      const userId = new ObjectId().toString();

      // Tab A opens and receives its initial replay.
      const streamA = baseDriver.openSSEStream({ userId });
      await expect(
        streamA.waitForEvent("userMetadataChanged", 2000),
      ).resolves.toBeDefined();

      // Register a second listener on tab A BEFORE tab B connects.
      const spuriousReplay = streamA.waitForEvent("userMetadataChanged", 300);

      // Tab B opens for the same user — should only replay to tab B.
      const streamB = baseDriver.openSSEStream({ userId });
      await expect(
        streamB.waitForEvent("userMetadataChanged", 2000),
      ).resolves.toBeDefined();

      // Tab A must NOT receive a second userMetadataChanged.
      await expect(spuriousReplay).rejects.toThrow("Timeout");

      streamA.close();
      streamB.close();
    });

    it("does not deliver events to unsubscribed users", async () => {
      const userId = new ObjectId().toString();
      const otherUserId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });
      await stream.waitForEvent("userMetadataChanged", 2000);

      const eventPromise = stream.waitForEvent("eventsChanged", 300);

      const { sseServer } = await import("./sse.server");
      sseServer.publishEventsChanged(otherUserId, {
        calendarId: new ObjectId().toHexString() as CalendarId,
        eventIds: [],
        reason: "reconciled",
      });

      await expect(eventPromise).rejects.toThrow("Timeout");

      stream.close();
    });
  });
});
