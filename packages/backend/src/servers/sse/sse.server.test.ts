/**
 * @jest-environment node
 *
 * we do not need the database for this test
 */

import { ObjectId } from "mongodb";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import {
  type ServerMessage,
  ServerMessageSchema,
} from "@core/types/server-message.contracts";
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

  describe("Publish-site conformance (A27): every `publish*` helper's written frame is a ServerMessage", () => {
    let sseServerModule: typeof import("./sse.server");

    beforeAll(async () => {
      sseServerModule = await import("./sse.server");
    });

    // One entry per `publish*` helper on SSEServer, each driving it with a
    // representative payload and the message `type` its frame should carry.
    // The reflection guard below requires this table to stay exhaustive.
    const cases: Array<{
      method: string;
      type: ServerMessage["type"];
      publish: (userId: string) => void;
    }> = [
      {
        method: "publishEventsChanged",
        type: "eventsChanged",
        publish: (userId) =>
          sseServerModule.sseServer.publishEventsChanged(userId, {
            calendarId: new ObjectId().toHexString() as CalendarId,
            eventIds: [new ObjectId().toHexString() as EventId],
            reason: "created",
          }),
      },
      {
        method: "publishCalendarsChanged",
        type: "calendarsChanged",
        publish: (userId) =>
          sseServerModule.sseServer.publishCalendarsChanged(userId, [
            new ObjectId().toHexString() as CalendarId,
          ]),
      },
      {
        method: "publishSyncStatus",
        type: "syncStatusChanged",
        publish: (userId) =>
          sseServerModule.sseServer.publishSyncStatus(userId, {
            status: "attention",
            code: "GOOGLE_REVOKED",
            retryable: false,
          }),
      },
      {
        method: "publishImportCompleted",
        type: "importCompleted",
        publish: (userId) =>
          sseServerModule.sseServer.publishImportCompleted(userId, {
            operation: "full",
            eventsCount: 12,
            calendarsCount: 3,
          }),
      },
      {
        method: "publishUserMetadata",
        type: "userMetadataChanged",
        publish: (userId) =>
          sseServerModule.sseServer.publishUserMetadata(userId, {
            syncEnabled: true,
          }),
      },
    ];

    it.each(
      cases,
    )("$method's written frame parses with ServerMessageSchema", async ({
      type,
      publish,
    }) => {
      const userId = new ObjectId().toString();
      const stream = baseDriver.openSSEStream({ userId });

      // Cold-start replay: also confirms the subscription is registered
      // server-side before `publish` runs below, same synchronization the
      // other tests in this file rely on to avoid a publish-before-
      // subscribe race.
      await stream.waitForEvent("userMetadataChanged", 2000);

      const framePromise = stream.waitForEvent(type, 2000);
      publish(userId);

      const frame = await framePromise;
      expect(() => ServerMessageSchema.parse(frame)).not.toThrow();
      expect((frame as { type: string }).type).toBe(type);

      stream.close();
    });

    // Mirrors gcal.service.test.ts's quotaUser conformance table (packet 07):
    // enumerate the SSEServer instance's own method surface and require
    // every `publish*` method (excluding the low-level `publish`/
    // `publishTo` primitives the helpers above are built on) to already
    // have a case in the table, so a future publisher can't silently skip
    // this contract.
    const listMethodNames = (instance: object): string[] => {
      const ownNames = Object.getOwnPropertyNames(instance);
      const proto = Object.getPrototypeOf(instance) as object | null;
      const protoNames =
        proto && proto !== Object.prototype
          ? Object.getOwnPropertyNames(proto).filter(
              (name) => name !== "constructor",
            )
          : [];

      return [...new Set([...ownNames, ...protoNames])].filter(
        (name) =>
          typeof (instance as Record<string, unknown>)[name] === "function",
      );
    };

    it("covers every publish* method on SSEServer (fails loudly if a new one is added without a case above)", () => {
      const allMethodNames = listMethodNames(sseServerModule.sseServer);
      const publishMethodNames = allMethodNames.filter(
        (name) =>
          name.startsWith("publish") &&
          name !== "publish" &&
          name !== "publishTo",
      );

      expect(new Set(publishMethodNames)).toEqual(
        new Set(cases.map((c) => c.method)),
      );
    });
  });
});
