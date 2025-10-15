import {
  GcalNotificationSchema,
  Resource_Sync,
  Result_Import_Gcal,
  Result_Sync_Gcal,
  Result_Sync_Prep_Gcal,
  Result_Watch_Stop,
  Schema_Sync,
  SyncDetails,
} from "@core/types/sync.types";

describe("GcalNotificationSchema", () => {
  it("validates a correct EVENTS notification", () => {
    const valid = {
      resource: Resource_Sync.EVENTS,
      channelId: "507f1f77bcf86cd799439011",
      resourceId: "some-resource-id",
      resourceState: "exists",
      expiration: new Date().toISOString(),
    };
    expect(() => GcalNotificationSchema.parse(valid)).not.toThrow();
  });

  it("validates a correct CALENDAR notification", () => {
    const valid = {
      resource: Resource_Sync.CALENDAR,
      channelId: "507f1f77bcf86cd799439011",
      resourceId: "calendar-resource-id",
      resourceState: "sync",
      expiration: new Date().toISOString(),
    };
    expect(() => GcalNotificationSchema.parse(valid)).not.toThrow();
  });

  it("fails for invalid resource type", () => {
    const invalid = {
      resource: "invalid",
      channelId: "507f1f77bcf86cd799439011",
      resourceId: "id",
      resourceState: "exists",
      expiration: new Date().toISOString(),
    };
    expect(() => GcalNotificationSchema.parse(invalid)).toThrow();
  });

  it("fails for missing required fields", () => {
    const invalid = {};
    expect(() => GcalNotificationSchema.parse(invalid)).toThrow();
  });

  it("fails for empty resourceId", () => {
    const invalid = {
      resource: Resource_Sync.EVENTS,
      channelId: "507f1f77bcf86cd799439011",
      resourceId: "",
      resourceState: "exists",
      expiration: new Date().toISOString(),
    };
    expect(() => GcalNotificationSchema.parse(invalid)).toThrow();
  });
});

describe("Resource_Sync enum", () => {
  it("contains expected values", () => {
    expect(Resource_Sync.CALENDAR).toBe("calendarlist");
    expect(Resource_Sync.EVENTS).toBe("events");
    expect(Resource_Sync.SETTINGS).toBe("settings");
  });
});

describe("SyncDetails type", () => {
  it("accepts valid structure", () => {
    const details: SyncDetails = {
      gCalendarId: "cal-id",
      nextSyncToken: "token",
      nextPageToken: "page-token",
      lastSyncedAt: new Date(),
    };
    expect(details.gCalendarId).toBe("cal-id");
    expect(details.nextSyncToken).toBe("token");
  });
});

describe("Result_Import_Gcal interface", () => {
  it("accepts valid structure", () => {
    const result: Result_Import_Gcal = {
      total: 5,
      nextSyncToken: "token",
      errors: [],
    };
    expect(result.total).toBe(5);
    expect(result.errors).toEqual([]);
  });
});

describe("Result_Sync_Prep_Gcal interface", () => {
  it("accepts valid structure", () => {
    const result: Result_Sync_Prep_Gcal = {
      syncToken: "token",
      operations: [],
      errors: [],
    };
    expect(result.syncToken).toBe("token");
    expect(Array.isArray(result.operations)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe("Result_Sync_Gcal interface", () => {
  it("accepts valid structure", () => {
    const result: Result_Sync_Gcal = {
      syncToken: {},
      events: undefined,
    };
    expect(typeof result.syncToken).toBe("object");
    expect(result.events).toBeUndefined();
  });
});

describe("Result_Watch_Stop type", () => {
  it("accepts valid array of objects", () => {
    const result: Result_Watch_Stop = [
      { channelId: "ch1", resourceId: "res1" },
      { channelId: "ch2", resourceId: "res2" },
    ];
    expect(result).toHaveLength(2);
    expect(result[0].channelId).toBe("ch1");
  });
});

describe("Schema_Sync interface", () => {
  it("accepts valid structure", () => {
    const schema: Schema_Sync = {
      user: "user-id",
      google: {
        calendarlist: [],
        events: [],
      },
    };
    expect(schema.user).toBe("user-id");
    expect(Array.isArray(schema.google.calendarlist)).toBe(true);
    expect(Array.isArray(schema.google.events)).toBe(true);
  });
});
