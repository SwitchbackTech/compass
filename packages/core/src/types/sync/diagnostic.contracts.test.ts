import {
  type DiagnosticConnectionResponse,
  DiagnosticConnectionResponseSchema,
} from "@core/types/sync/diagnostic.contracts";
import { describe, expect, it } from "bun:test";

const sample = (): DiagnosticConnectionResponse => ({
  diagnosticKey: "a".repeat(32),
  connectionId: "507f1f77bcf86cd799439011",
  tenantId: "507f1f77bcf86cd799439012",
  principalId: "507f1f77bcf86cd799439013",
  provider: "google",
  state: "delayed",
  stateReason: null,
  accountEmail: "user@example.com",
  lastSyncedAt: "2026-07-24T12:00:00.000Z",
  lastHealthyAt: "2026-07-24T11:00:00.000Z",
  disconnectedAt: null,
  calendarCount: 2,
  pendingJobCount: 1,
  pendingCommandCount: 0,
});

describe("DiagnosticConnectionResponseSchema", () => {
  it("accepts a metadata-only support payload", () => {
    expect(DiagnosticConnectionResponseSchema.safeParse(sample()).success).toBe(
      true,
    );
  });

  it("rejects event content / credential fields", () => {
    expect(
      DiagnosticConnectionResponseSchema.safeParse({
        ...sample(),
        title: "Secret meeting",
      }).success,
    ).toBe(false);
    expect(
      DiagnosticConnectionResponseSchema.safeParse({
        ...sample(),
        refreshToken: "tok",
      }).success,
    ).toBe(false);
  });

  it("rejects a short diagnostic key", () => {
    expect(
      DiagnosticConnectionResponseSchema.safeParse({
        ...sample(),
        diagnosticKey: "abc",
      }).success,
    ).toBe(false);
  });
});
