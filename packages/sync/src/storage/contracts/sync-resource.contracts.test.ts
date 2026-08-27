import {
  ResourceBootstrapStateSchema,
  SyncResourceRecordSchema,
} from "./sync-resource.contracts";
import { describe, expect, it } from "bun:test";

const objectId = "64a0a0a0a0a0a0a0a0a0a0a0";

const validRecord = {
  _id: objectId,
  tenantId: objectId,
  principalId: objectId,
  connectionId: objectId,
  resourceKind: "calendarList" as const,
  calendarId: null,
  syncCursor: null,
  pageCursor: null,
  importGeneration: 0,
  activeGeneration: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastFullListAt: new Date("2026-08-27T17:19:51.000Z"),
  lastReadFailureAt: null,
  lastReadFailureDetail: null,
  bootstrapState: "ready" as const,
  watchUnsupportedAt: null,
  subscriptionId: null,
  subscriptionResourceId: null,
  subscriptionToken: null,
  subscriptionExpiresAt: null,
  changeNotifiedAt: null,
  pushLastReceivedAt: null,
  cursorExpiredStreak: 0,
  cursorExpiredBackoffUntil: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-27T17:19:51.000Z"),
};

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

describe("SyncResourceRecordSchema", () => {
  it("parses a complete resource", () => {
    const parsed = SyncResourceRecordSchema.parse(validRecord);
    expect(parsed.lastFullListAt).toEqual(validRecord.lastFullListAt);
    expect(parsed.bootstrapState).toBe("ready");
  });

  it("strips a newer writer's unknown key instead of failing the whole read", () => {
    // 2026-08-27: lastFullListAt was the key that 500'd GET /connections and
    // reopened the Sync-job-engine catch-all during #2908's rolling deploy.
    // The next additive field must not repeat that. Missing required fields
    // still throw — see the bootstrapState test below.
    const parsed = SyncResourceRecordSchema.parse({
      ...validRecord,
      addedByNewerWriter: "must-not-brick-older-replicas",
    });
    expect(parsed.lastFullListAt).toEqual(validRecord.lastFullListAt);
    expect("addedByNewerWriter" in parsed).toBe(false);
  });

  it("still rejects a row missing a required field", () => {
    const { bootstrapState: _dropped, ...withoutBootstrap } = validRecord;
    expect(() => SyncResourceRecordSchema.parse(withoutBootstrap)).toThrow();
  });
});
