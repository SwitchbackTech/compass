import { faker } from "@faker-js/faker";
import { EventSchema } from "@core/types/event.contracts";
import { CommandSubmitRequestSchema } from "@core/types/sync/command.contracts";
import {
  resolveCommandTarget,
  toCreateSubmitRequest,
  toDeleteSubmitRequest,
  toReplaceSubmitRequests,
  toSyncContent,
} from "./event-command.translation";
import { composeOccurrenceId } from "./occurrence-id";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

const timedSchedule = {
  kind: "timed" as const,
  start: "2026-07-14T09:00:00.000Z",
  end: "2026-07-14T10:00:00.000Z",
  timeZone: "UTC",
};

describe("toSyncContent", () => {
  it("pads browser details into the full sync content shape", () => {
    expect(
      toSyncContent({ title: "Standup", description: "Daily", location: "" }),
    ).toEqual({
      title: "Standup",
      description: "Daily",
      location: "",
      organizer: null,
      attendees: [],
      conference: null,
    });
  });

  it("forwards the browser's location onto sync content", () => {
    expect(
      toSyncContent({
        title: "Standup",
        description: "Daily",
        location: "Room A",
      }),
    ).toEqual({
      title: "Standup",
      description: "Daily",
      location: "Room A",
      organizer: null,
      attendees: [],
      conference: null,
    });
  });

  it("forwards an optional color onto sync content", () => {
    expect(
      toSyncContent({
        title: "Standup",
        description: "Daily",
        location: "",
        color: "coral",
      }),
    ).toEqual({
      title: "Standup",
      description: "Daily",
      location: "",
      organizer: null,
      attendees: [],
      conference: null,
      color: "coral",
    });
  });

  it("omits color when the browser did not set one", () => {
    expect(
      toSyncContent({ title: "Standup", description: "Daily", location: "" }),
    ).not.toHaveProperty("color");
  });
});

describe("resolveCommandTarget", () => {
  it("decodes a composed occurrence id into eventId + recurrenceId", () => {
    const eventId = objectId();
    const recurrenceId = "2026-07-14T09:00:00.000Z";
    const id = composeOccurrenceId({ eventId, recurrenceId });

    expect(resolveCommandTarget(id, "this")).toEqual({
      eventId,
      scope: "this",
      recurrenceId,
    });
  });

  it("drops recurrenceId when scope is all on a composed id", () => {
    const eventId = objectId();
    const id = composeOccurrenceId({
      eventId,
      recurrenceId: "2026-07-14T09:00:00.000Z",
    });

    expect(resolveCommandTarget(id, "all")).toEqual({
      eventId,
      scope: "all",
      recurrenceId: null,
    });
  });

  it("coerces a plain id with scope this to all + null recurrenceId", () => {
    // Web sends scope "this" for singles; sync requires scope all ⇔ no recurrenceId.
    const eventId = objectId();
    expect(resolveCommandTarget(eventId, "this")).toEqual({
      eventId,
      scope: "all",
      recurrenceId: null,
    });
  });

  it("throws on a composite id whose recurrenceId is malformed, rather than widening to scope all", () => {
    // Must never silently fall through to "plain id" and delete/edit the
    // WHOLE series when the caller only meant one instance.
    const id = `${objectId()}::not-a-real-datetime`;
    expect(() => resolveCommandTarget(id, "this")).toThrow(
      /INVALID_OCCURRENCE_ID|could not be decoded/,
    );
  });

  it("throws on a doubly-composed id (a thisAndFollowing split's own occurrence)", () => {
    const id = `${objectId()}::2026-07-14T09:00:00.000Z::2026-07-21T09:00:00.000Z`;
    expect(() => resolveCommandTarget(id, "this")).toThrow();
  });

  it("throws on a composite id whose eventId segment is not an ObjectId", () => {
    const id = "not-an-object-id::2026-07-14T09:00:00.000Z";
    expect(() => resolveCommandTarget(id, "this")).toThrow();
  });
});

describe("toCreateSubmitRequest", () => {
  it("builds a create command and a parseable response Event", () => {
    const calendarId = objectId();
    const eventId = objectId();
    const { request, responseEvent } = toCreateSubmitRequest({
      id: eventId,
      calendarId,
      content: {
        kind: "details",
        title: "Lunch",
        description: "",
        location: "",
      },
      schedule: timedSchedule,
      recurrence: { kind: "single" },
    });

    expect(() => CommandSubmitRequestSchema.parse(request)).not.toThrow();
    expect(request.eventId).toBe(eventId);
    expect(request.idempotencyKey).toBe(`create:${eventId}`);
    expect(request.expectedVersion).toBeNull();
    expect(request.input).toMatchObject({
      kind: "create",
      calendarId,
      clientEventId: eventId,
      invitation: "none",
      recurrence: { kind: "single" },
    });
    expect(() => EventSchema.parse(responseEvent)).not.toThrow();
    expect(responseEvent.id).toBe(eventId);
  });

  it("mints an eventId when the client omits one", () => {
    const { request } = toCreateSubmitRequest({
      calendarId: objectId(),
      content: { kind: "details", title: "X", description: "", location: "" },
      schedule: timedSchedule,
      recurrence: { kind: "single" },
    });

    expect(request.eventId).toMatch(/^[0-9a-f]{24}$/);
    expect(request.idempotencyKey).toBe(`create:${request.eventId}`);
    expect(request.input).toMatchObject({
      kind: "create",
      clientEventId: null,
    });
  });

  it("forwards restore:true from an undo-of-delete input", () => {
    const { request } = toCreateSubmitRequest({
      id: objectId(),
      calendarId: objectId(),
      content: { kind: "details", title: "X", description: "", location: "" },
      schedule: timedSchedule,
      recurrence: { kind: "single" },
      restore: true,
    });

    expect(request.restore).toBe(true);
    expect(() => CommandSubmitRequestSchema.parse(request)).not.toThrow();
  });

  it("omits restore when the input does not set it", () => {
    const { request } = toCreateSubmitRequest({
      calendarId: objectId(),
      content: { kind: "details", title: "X", description: "", location: "" },
      schedule: timedSchedule,
      recurrence: { kind: "single" },
    });

    expect(request.restore).toBeUndefined();
  });
});

describe("toReplaceSubmitRequests", () => {
  it("emits a single update for a plain-id replace without a calendar move", () => {
    const eventId = objectId();
    const { requests, responseEvent } = toReplaceSubmitRequests(eventId, {
      content: {
        kind: "details",
        title: "Renamed",
        description: "",
        location: "",
      },
      schedule: timedSchedule,
      recurrence: { kind: "preserve" },
      scope: "this",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.input.kind).toBe("update");
    if (requests[0]?.input.kind !== "update") return;
    // Plain id + scope this → coerced to all.
    expect(requests[0].input.scope).toBe("all");
    expect(requests[0].input.recurrenceId).toBeNull();
    expect(() => EventSchema.parse(responseEvent)).not.toThrow();
  });

  it("addresses an occurrence update with the decoded recurrenceId", () => {
    const eventId = objectId();
    const recurrenceId = "2026-07-14T09:00:00.000Z";
    const id = composeOccurrenceId({ eventId, recurrenceId });
    const { requests } = toReplaceSubmitRequests(id, {
      content: {
        kind: "details",
        title: "Moved",
        description: "",
        location: "",
      },
      schedule: timedSchedule,
      recurrence: { kind: "preserve" },
      scope: "this",
    });

    expect(requests).toHaveLength(1);
    const update = requests[0];
    expect(update?.eventId).toBe(eventId);
    if (update?.input.kind !== "update") return;
    expect(update.input.scope).toBe("this");
    expect(update.input.recurrenceId).toBe(recurrenceId);
  });

  it("forwards restore:true without changing the update idempotency key", () => {
    const eventId = objectId();
    const input = {
      content: {
        kind: "details" as const,
        title: "Renamed",
        description: "",
        location: "",
      },
      schedule: timedSchedule,
      recurrence: { kind: "preserve" as const },
      scope: "this" as const,
    };
    const { requests: plain } = toReplaceSubmitRequests(eventId, input);
    const { requests: restored } = toReplaceSubmitRequests(eventId, {
      ...input,
      restore: true,
    });

    expect(plain[0]?.restore).toBeUndefined();
    expect(restored[0]?.restore).toBe(true);
    // The whole point: a replayed edit collides with the original update's
    // command record, so the reopen guard in command-replay.ts can act on it.
    expect(restored[0]?.idempotencyKey).toBe(plain[0]?.idempotencyKey);
  });

  it("appends a move command when calendarId is present", () => {
    const eventId = objectId();
    const calendarId = objectId();
    const { requests } = toReplaceSubmitRequests(eventId, {
      calendarId,
      content: { kind: "details", title: "X", description: "", location: "" },
      schedule: timedSchedule,
      recurrence: { kind: "single" },
      scope: "this",
    });

    expect(requests.map((r) => r.input.kind)).toEqual(["update", "move"]);
    expect(requests[1]?.input).toEqual({ kind: "move", calendarId });
    // Distinct idempotency keys so the two stay independently retryable.
    expect(requests[0]?.idempotencyKey).not.toBe(requests[1]?.idempotencyKey);
  });
});

describe("toDeleteSubmitRequest", () => {
  it("builds a delete command from a composed occurrence id", () => {
    const eventId = objectId();
    const recurrenceId = "2026-07-14T09:00:00.000Z";
    const id = composeOccurrenceId({ eventId, recurrenceId });
    const request = toDeleteSubmitRequest(id, { scope: "this" });

    expect(() => CommandSubmitRequestSchema.parse(request)).not.toThrow();
    expect(request.eventId).toBe(eventId);
    if (request.input.kind !== "delete") return;
    expect(request.input.scope).toBe("this");
    expect(request.input.recurrenceId).toBe(recurrenceId);
  });

  // Pins the retry contract: submitCommandOrThrow retries a timed-out delete
  // under the SAME key so it maps back to the original command instead of
  // double-submitting. This is deliberate, not an oversight — two identical
  // deletes (including a delete, an undo that recreates the event under the
  // same id, and a second delete) collide on one command record on purpose.
  // Telling a genuine retry apart from a stale replay is Sync's job
  // (submitCloudCommand's terminalReplayIsStale), not the key's. Don't add a
  // nonce here.
  it("produces the same idempotency key for two identical deletes", () => {
    const eventId = objectId();
    const first = toDeleteSubmitRequest(eventId, { scope: "all" });
    const second = toDeleteSubmitRequest(eventId, { scope: "all" });

    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });
});
