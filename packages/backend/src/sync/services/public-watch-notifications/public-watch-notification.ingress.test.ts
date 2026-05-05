import { ObjectId } from "mongodb";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { encodeChannelToken } from "@backend/sync/services/watch/google-watch-token";
import {
  hasPublicWatchNotificationHeaders,
  parsePublicWatchNotification,
} from "./public-watch-notification.ingress";

const makeHeaders = (overrides: Record<string, string | undefined> = {}) => ({
  "x-goog-channel-id": new ObjectId().toString(),
  "x-goog-channel-token": encodeChannelToken({
    resource: Resource_Sync.EVENTS,
  }),
  "x-goog-resource-id": "resource-id",
  "x-goog-resource-state": XGoogleResourceState.EXISTS,
  "x-goog-channel-expiration": new Date("2035-01-01").toISOString(),
  ...overrides,
});

describe("publicWatchNotificationIngress", () => {
  it("parses valid Public watch notification headers", () => {
    const headers = makeHeaders();

    expect(parsePublicWatchNotification(headers)).toEqual({
      resource: Resource_Sync.EVENTS,
      channelId: new ObjectId(headers["x-goog-channel-id"]),
      resourceId: "resource-id",
      resourceState: XGoogleResourceState.EXISTS,
      expiration: new Date("2035-01-01"),
    });
  });

  it("returns undefined when a required Google header is missing", () => {
    const headers = makeHeaders({ "x-goog-resource-id": undefined });

    expect(hasPublicWatchNotificationHeaders(headers)).toBe(false);
    expect(parsePublicWatchNotification(headers)).toBeUndefined();
  });

  it("returns undefined when the channel token is invalid", () => {
    const headers = makeHeaders({ "x-goog-channel-token": "not-base64" });

    expect(parsePublicWatchNotification(headers)).toBeUndefined();
  });

  it("throws when the Google payload shape is invalid", () => {
    const headers = makeHeaders({
      "x-goog-resource-state": "surprise",
    });

    expect(() => parsePublicWatchNotification(headers)).toThrow();
  });
});
