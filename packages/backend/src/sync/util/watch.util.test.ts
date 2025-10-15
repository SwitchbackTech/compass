import { faker } from "@faker-js/faker/.";
import { Resource_Sync } from "@core/types/sync.types";
import { ENV } from "@backend/common/constants/env.constants";
import {
  decodeChannelToken,
  encodeChannelToken,
} from "@backend/sync/util/watch.util";

// Mock ENV
jest.mock("@backend/common/constants/env.constants", () => ({
  ENV: { TOKEN_GCAL_NOTIFICATION: "test-notification-token" },
}));

describe("watch.util", () => {
  const notificationToken = ENV.TOKEN_GCAL_NOTIFICATION;

  describe("encodeChannelToken", () => {
    it.each([
      { resource: Resource_Sync.EVENTS },
      { resource: Resource_Sync.CALENDAR },
    ])(
      "should encode $resource channel data into a base64 token",
      ({ resource }) => {
        const token = encodeChannelToken({ resource });

        expect(typeof token).toBe("string");

        // Decoding should yield a valid ChannelToken
        const decoded = Buffer.from(token, "base64").toString("utf-8");

        expect(decoded).toContain(`token=${notificationToken}`);
        expect(decoded).toContain(`resource=${resource}`);
      },
    );

    it("should throw if an invalid resource is supplied", () => {
      const resource = faker.lorem.word() as Resource_Sync;

      expect(() => encodeChannelToken({ resource })).toThrow();
    });

    it("should throw if an empty resource field is supplied", () => {
      const resource = "" as Resource_Sync;

      expect(() => encodeChannelToken({ resource })).toThrow();
    });

    it("should throw if the resource field is not supplied", () => {
      const resource = undefined as unknown as Resource_Sync;

      expect(() => encodeChannelToken({ resource })).toThrow();
    });
  });

  describe("decodeChannelToken", () => {
    it.each([
      { resource: Resource_Sync.EVENTS },
      { resource: Resource_Sync.CALENDAR },
    ])(
      "should decode a token back to the original channel data",
      ({ resource }) => {
        const token = encodeChannelToken({ resource });
        const result = decodeChannelToken(token);

        // Should match the original data plus the token from ENV
        expect(result).toEqual({
          token: notificationToken,
          resource,
        });
      },
    );

    it("should throw if token is invalid base64", () => {
      expect(() => decodeChannelToken("not-base64!")).toThrow();
    });

    it("should throw if token is missing required fields", () => {
      // Create a token missing required fields
      const params = new URLSearchParams({ foo: "bar" }).toString();
      const badToken = Buffer.from(params).toString("base64");
      expect(() => decodeChannelToken(badToken)).toThrow();
    });

    it("should throw if token field does not match ENV.TOKEN_GCAL_NOTIFICATION", () => {
      // Create a valid ChannelToken but with wrong token value
      const params = new URLSearchParams({
        token: "wrong-token",
        resource: Resource_Sync.EVENTS,
      }).toString();

      const badToken = Buffer.from(params).toString("base64");

      expect(() => decodeChannelToken(badToken)).toThrow(
        /Invalid channel token/,
      );
    });

    it("should throw if token is missing the token field", () => {
      // Missing 'token' field
      const params = new URLSearchParams({
        resource: Resource_Sync.EVENTS,
      }).toString();
      const badToken = Buffer.from(params).toString("base64");
      expect(() => decodeChannelToken(badToken)).toThrow();
    });

    it("should throw if token is missing the resource field", () => {
      // Missing 'resource' field
      const params = new URLSearchParams({
        token: ENV.TOKEN_GCAL_NOTIFICATION,
      }).toString();
      const badToken = Buffer.from(params).toString("base64");
      expect(() => decodeChannelToken(badToken)).toThrow();
    });

    it("should throw if token is empty", () => {
      expect(() => decodeChannelToken("")).toThrow();
    });
  });
});
