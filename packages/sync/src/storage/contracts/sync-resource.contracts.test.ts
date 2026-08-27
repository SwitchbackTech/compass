import {
  ResourceBootstrapStateSchema,
  SyncResourceReadSchema,
  SyncResourceRecordSchema,
} from "./sync-resource.contracts";
import { describe, expect, it } from "bun:test";

describe("ResourceBootstrapStateSchema", () => {
  it("parses every known state", () => {
    for (const state of ["importing", "watching", "catchingUp", "ready"]) {
      expect(ResourceBootstrapStateSchema.parse(state)).toBe(state);
    }
  });

  it("rejects a missing value - no default (backfill-bootstrap-state stamps every row explicitly instead)", () => {
    expect(() => ResourceBootstrapStateSchema.parse(undefined)).toThrow();
  });
});

describe("SyncResourceReadSchema", () => {
  const record = {
    _id: "507f1f77bcf86cd799439011",
    tenantId: "507f1f77bcf86cd799439012",
    principalId: "507f1f77bcf86cd799439013",
    connectionId: "507f1f77bcf86cd799439014",
    resourceKind: "events",
    calendarId: "507f1f77bcf86cd799439015",
    syncCursor: null,
    pageCursor: null,
    importGeneration: 0,
    activeGeneration: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    bootstrapState: "ready",
    subscriptionId: null,
    subscriptionResourceId: null,
    subscriptionToken: null,
    subscriptionExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("keeps a field a newer build stamped, so an old build survives a rolling deploy", () => {
    const parsed = SyncResourceReadSchema.parse({
      ...record,
      fieldFromNewerBuild: "value the old build never heard of",
    });
    expect(parsed.resourceKind).toBe("events");
  });

  it("still rejects an unknown key on write, so this build cannot persist a typo", () => {
    expect(() =>
      SyncResourceRecordSchema.parse({ ...record, typoedKey: 1 }),
    ).toThrow();
  });
});
