/**
 * @jest-environment node
 *
 * we do not need the database for this test
 */

import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { ObjectId } from "mongodb";

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

  describe("Subscription and events:", () => {
    it("delivers EVENT_CHANGED to a subscribed user", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });
      const eventPromise = stream.waitForEvent(EVENT_CHANGED, 2000);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { sseServer } = await import("./sse.server");
      sseServer.handleBackgroundCalendarChange(userId);

      await expect(eventPromise).resolves.toBeDefined();

      stream.close();
    });

    it("delivers SOMEDAY_EVENT_CHANGED to a subscribed user", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });
      const eventPromise = stream.waitForEvent(SOMEDAY_EVENT_CHANGED, 2000);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { sseServer } = await import("./sse.server");
      sseServer.handleBackgroundSomedayChange(userId);

      await expect(eventPromise).resolves.toBeDefined();

      stream.close();
    });

    it("replays USER_METADATA on connection (cold start)", async () => {
      const userId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });

      await expect(
        stream.waitForEvent(USER_METADATA, 2000),
      ).resolves.toBeDefined();

      stream.close();
    });

    it("does not replay USER_METADATA to existing tabs when a new tab opens", async () => {
      const userId = new ObjectId().toString();

      // Tab A opens and receives its initial replay.
      const streamA = baseDriver.openSSEStream({ userId });
      await expect(
        streamA.waitForEvent(USER_METADATA, 2000),
      ).resolves.toBeDefined();

      // Register a second listener on tab A BEFORE tab B connects.
      const spuriousReplay = streamA.waitForEvent(USER_METADATA, 300);

      // Tab B opens for the same user — should only replay to tab B.
      const streamB = baseDriver.openSSEStream({ userId });
      await expect(
        streamB.waitForEvent(USER_METADATA, 2000),
      ).resolves.toBeDefined();

      // Tab A must NOT receive a second USER_METADATA.
      await expect(spuriousReplay).rejects.toThrow("Timeout");

      streamA.close();
      streamB.close();
    });

    it("does not deliver events to unsubscribed users", async () => {
      const userId = new ObjectId().toString();
      const otherUserId = new ObjectId().toString();

      const stream = baseDriver.openSSEStream({ userId });

      const eventPromise = stream.waitForEvent(EVENT_CHANGED, 300);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { sseServer } = await import("./sse.server");
      sseServer.handleBackgroundCalendarChange(otherUserId);

      await expect(eventPromise).rejects.toThrow("Timeout");

      stream.close();
    });
  });
});
