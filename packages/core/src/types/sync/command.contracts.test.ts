import { faker } from "@faker-js/faker";
import {
  SyncCommandFailureReasonSchema,
  SyncCommandInputSchema,
  SyncCommandOutcomeSchema,
  SyncCommandSchema,
} from "@core/types/sync/command.contracts";

const objectId = () => faker.database.mongodbObjectId();

const timedSchedule = {
  kind: "timed",
  start: "2026-07-14T09:00:00-06:00",
  end: "2026-07-14T10:00:00-06:00",
  timeZone: "America/Denver",
};

const baseContent = {
  title: "Standup",
  description: "Daily sync",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
};

const createInput = () => ({
  kind: "create",
  calendarId: objectId(),
  content: baseContent,
  schedule: timedSchedule,
  recurrence: { kind: "single" },
});

const updateInput = (scope: string = "this") => ({
  kind: "update",
  content: baseContent,
  schedule: timedSchedule,
  recurrence: { kind: "preserve" },
  scope,
});

const moveInput = () => ({ kind: "move", calendarId: objectId() });

const deleteInput = (scope: string = "this") => ({
  kind: "delete",
  scope,
});

const pendingOutcome = { state: "pending" };

const confirmedLocalOutcome = {
  state: "confirmed",
  providerEventId: null,
  providerVersion: null,
};

const confirmedLinkedOutcome = {
  state: "confirmed",
  providerEventId: "abc123@google.com",
  providerVersion: "etag-1",
};

const baseCommand = (overrides: Record<string, unknown> = {}) => ({
  id: objectId(),
  tenantId: objectId(),
  principalId: objectId(),
  idempotencyKey: "client-generated-key-1",
  eventId: objectId(),
  input: createInput(),
  expectedVersion: null,
  outcome: pendingOutcome,
  attemptCount: 0,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

describe("Sync command contracts", () => {
  describe("SyncCommandInputSchema", () => {
    it("accepts a create input", () => {
      expect(SyncCommandInputSchema.safeParse(createInput()).success).toBe(
        true,
      );
    });

    it("defaults a create's clientEventId to null when absent", () => {
      const parsed = SyncCommandInputSchema.safeParse(createInput());
      expect(parsed.success && parsed.data.kind === "create").toBe(true);
      if (parsed.success && parsed.data.kind === "create") {
        expect(parsed.data.clientEventId).toBeNull();
      }
    });

    it("accepts a create carrying a clientEventId for promotion", () => {
      const promoted = { ...createInput(), clientEventId: objectId() };
      const parsed = SyncCommandInputSchema.safeParse(promoted);
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.kind === "create") {
        expect(parsed.data.clientEventId).toBe(promoted.clientEventId);
      }
    });

    it.each([
      "this",
      "thisAndFollowing",
      "all",
    ] as const)("accepts an update input with scope %s", (scope) => {
      expect(SyncCommandInputSchema.safeParse(updateInput(scope)).success).toBe(
        true,
      );
    });

    it("defaults an update's invitation to none when absent", () => {
      const parsed = SyncCommandInputSchema.safeParse(updateInput());
      expect(parsed.success && parsed.data.kind === "update").toBe(true);
      if (parsed.success && parsed.data.kind === "update") {
        expect(parsed.data.invitation).toBe("none");
      }
    });

    it("accepts an update carrying an explicit invitation", () => {
      const parsed = SyncCommandInputSchema.safeParse({
        ...updateInput(),
        invitation: "all",
      });
      expect(parsed.success && parsed.data.kind === "update").toBe(true);
      if (parsed.success && parsed.data.kind === "update") {
        expect(parsed.data.invitation).toBe("all");
      }
    });

    it("accepts a move input", () => {
      expect(SyncCommandInputSchema.safeParse(moveInput()).success).toBe(true);
    });

    it("rejects a move input carrying content", () => {
      const input = { ...moveInput(), content: baseContent };
      expect(SyncCommandInputSchema.safeParse(input).success).toBe(false);
    });

    it.each([
      "this",
      "thisAndFollowing",
      "all",
    ] as const)("accepts a delete input with scope %s", (scope) => {
      expect(SyncCommandInputSchema.safeParse(deleteInput(scope)).success).toBe(
        true,
      );
    });

    it("rejects an update input carrying a calendarId", () => {
      const input = { ...updateInput(), calendarId: objectId() };
      expect(SyncCommandInputSchema.safeParse(input).success).toBe(false);
    });

    it("rejects an unrecognized kind", () => {
      expect(
        SyncCommandInputSchema.safeParse({ kind: "archive" }).success,
      ).toBe(false);
    });
  });

  describe("SyncCommandOutcomeSchema", () => {
    it.each([
      "pending",
      "applying",
      "reconciling",
      "cancelled",
    ] as const)("accepts the bare %s state", (state) => {
      expect(SyncCommandOutcomeSchema.safeParse({ state }).success).toBe(true);
    });

    it("accepts a locally confirmed outcome with no provider target", () => {
      expect(
        SyncCommandOutcomeSchema.safeParse(confirmedLocalOutcome).success,
      ).toBe(true);
    });

    it("accepts a provider-confirmed outcome with full identity", () => {
      expect(
        SyncCommandOutcomeSchema.safeParse(confirmedLinkedOutcome).success,
      ).toBe(true);
    });

    it("rejects a confirmed outcome with providerEventId but no providerVersion", () => {
      const outcome = { ...confirmedLinkedOutcome, providerVersion: null };
      expect(SyncCommandOutcomeSchema.safeParse(outcome).success).toBe(false);
    });

    it("rejects a confirmed outcome with providerVersion but no providerEventId", () => {
      const outcome = { ...confirmedLinkedOutcome, providerEventId: null };
      expect(SyncCommandOutcomeSchema.safeParse(outcome).success).toBe(false);
    });

    it.each(
      SyncCommandFailureReasonSchema.options,
    )("accepts a failed outcome with reason %s", (failureReason) => {
      const outcome = { state: "failed", failureReason };
      expect(SyncCommandOutcomeSchema.safeParse(outcome).success).toBe(true);
    });

    it("rejects a failed outcome missing a failureReason", () => {
      expect(
        SyncCommandOutcomeSchema.safeParse({ state: "failed" }).success,
      ).toBe(false);
    });

    it("rejects an unrecognized state", () => {
      expect(
        SyncCommandOutcomeSchema.safeParse({ state: "unknown" }).success,
      ).toBe(false);
    });
  });

  describe("SyncCommandSchema", () => {
    it("accepts a pending create command with no expectedVersion", () => {
      expect(SyncCommandSchema.safeParse(baseCommand()).success).toBe(true);
    });

    it("rejects a create command carrying an expectedVersion", () => {
      const command = baseCommand({ expectedVersion: "etag-0" });
      expect(SyncCommandSchema.safeParse(command).success).toBe(false);
    });

    it("accepts an update command with a stale expectedVersion under a versionConflict failure", () => {
      const command = baseCommand({
        input: updateInput(),
        expectedVersion: "etag-stale",
        outcome: { state: "failed", failureReason: "versionConflict" },
      });
      expect(SyncCommandSchema.safeParse(command).success).toBe(true);
    });

    it("accepts an update command with a null expectedVersion for a not-yet-linked event", () => {
      const command = baseCommand({
        input: updateInput(),
        expectedVersion: null,
      });
      expect(SyncCommandSchema.safeParse(command).success).toBe(true);
    });

    it("accepts a create command that ends up reconciling an ambiguous response", () => {
      const command = baseCommand({ outcome: { state: "reconciling" } });
      expect(SyncCommandSchema.safeParse(command).success).toBe(true);
    });

    it("accepts a delete command rejected for targeting a read-only calendar", () => {
      const command = baseCommand({
        input: deleteInput(),
        outcome: { state: "failed", failureReason: "readOnlyCalendar" },
      });
      expect(SyncCommandSchema.safeParse(command).success).toBe(true);
    });

    it("accepts a high attemptCount representing exhausted retries", () => {
      const command = baseCommand({ attemptCount: 40 });
      expect(SyncCommandSchema.safeParse(command).success).toBe(true);
    });

    it("rejects a negative attemptCount", () => {
      const command = baseCommand({ attemptCount: -1 });
      expect(SyncCommandSchema.safeParse(command).success).toBe(false);
    });

    it("rejects a raw provider credential field", () => {
      const command = baseCommand({ accessToken: "leak" });
      expect(SyncCommandSchema.safeParse(command).success).toBe(false);
    });

    it("round-trips through JSON unchanged", () => {
      const command = baseCommand({
        input: updateInput("thisAndFollowing"),
        expectedVersion: "etag-1",
        outcome: confirmedLinkedOutcome,
      });
      const parsed = SyncCommandSchema.parse(command);
      expect(
        SyncCommandSchema.parse(JSON.parse(JSON.stringify(parsed))),
      ).toEqual(parsed);
    });
  });
});
