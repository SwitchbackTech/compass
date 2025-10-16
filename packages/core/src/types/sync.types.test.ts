import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import {
  GcalNotificationSchema,
  Resource_Sync,
  XGoogleResourceState,
} from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";

describe("GcalNotificationSchema", () => {
  it("validates a correct EVENTS notification", () => {
    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();

    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();

    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.NOT_EXISTS,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();
  });

  it("validates a correct CALENDAR notification", () => {
    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.CALENDAR,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();

    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.CALENDAR,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();

    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.CALENDAR,
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.NOT_EXISTS,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).not.toThrow();
  });

  it("fails for invalid resource type", () => {
    expect(() =>
      GcalNotificationSchema.parse({
        resource: "invalid",
        channelId: new ObjectId(),
        resourceId: faker.string.ulid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).toThrow();
  });

  it("fails for missing required fields", () => {
    expect(() => GcalNotificationSchema.parse({})).toThrow();
  });

  it("fails for empty resourceId", () => {
    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: "",
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().add(1, "day").toDate(),
      }),
    ).toThrow();
  });

  it("fails for expired notifications", () => {
    expect(() =>
      GcalNotificationSchema.parse({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: "",
        resourceState: XGoogleResourceState.SYNC,
        expiration: dayjs().subtract(1, "day").toDate(),
      }),
    ).toThrow();
  });
});
