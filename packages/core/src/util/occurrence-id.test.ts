import { faker } from "@faker-js/faker";
import {
  composeOccurrenceId,
  composeOccurrenceIdFromSchedule,
  decodeOccurrenceId,
  looksLikeOccurrenceId,
} from "@core/util/occurrence-id";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

describe("occurrence id codec", () => {
  it("round-trips an eventId and recurrenceId", () => {
    const parts = {
      eventId: objectId(),
      recurrenceId: "2026-07-14T15:00:00.000Z",
    };
    expect(decodeOccurrenceId(composeOccurrenceId(parts))).toEqual(parts);
  });

  it("round-trips a recurrenceId carrying a UTC offset (colons in the tail)", () => {
    // The ISO tail has its own colons; only the FIRST `::` separates the parts.
    const parts = {
      eventId: objectId(),
      recurrenceId: "2026-03-08T01:30:00-07:00",
    };
    expect(decodeOccurrenceId(composeOccurrenceId(parts))).toEqual(parts);
  });

  it("decodes a plain event id (no separator) to null", () => {
    expect(decodeOccurrenceId(objectId())).toBeNull();
  });

  it("rejects a composite whose eventId is not an ObjectId", () => {
    expect(
      decodeOccurrenceId("not-an-id::2026-07-14T15:00:00.000Z"),
    ).toBeNull();
  });

  it("rejects a composite whose recurrenceId is not an ISO datetime", () => {
    expect(decodeOccurrenceId(`${objectId()}::yesterday`)).toBeNull();
  });

  it("does not mistake a bare ObjectId or empty string for an occurrence", () => {
    expect(decodeOccurrenceId("")).toBeNull();
    expect(decodeOccurrenceId(`${objectId()}`)).toBeNull();
  });

  it("rejects a doubly-composed id (a thisAndFollowing split's own occurrences)", () => {
    // seriesId::start::start2 — the first `::` splits off a non-ObjectId
    // "eventId", so this must fail to decode rather than partially parse.
    const nested = `${objectId()}::2026-07-14T15:00:00.000Z::2026-07-21T15:00:00.000Z`;
    expect(decodeOccurrenceId(nested)).toBeNull();
  });
});

describe("looksLikeOccurrenceId", () => {
  it("is true for anything containing the separator, decodable or not", () => {
    expect(
      looksLikeOccurrenceId(`${objectId()}::2026-07-14T15:00:00.000Z`),
    ).toBe(true);
    expect(looksLikeOccurrenceId(`${objectId()}::garbage`)).toBe(true);
  });

  it("is false for a plain event id", () => {
    expect(looksLikeOccurrenceId(objectId())).toBe(false);
  });
});

// These fixtures are the cross-package contract: the web composes ids
// optimistically (ahead of a settle refetch) using this exact function, and
// packages/sync's occurrence projection independently computes the same
// recurrenceId for the confirmed instance
// (scheduleStartAt + occurrence.startAt.toISOString(), see
// packages/sync/src/domain/occurrence-projection.ts). A mismatch here is
// exactly the bug class where "delete this instance" silently escalates to
// "delete the whole series" because the id fails to decode server-side.
describe("composeOccurrenceIdFromSchedule", () => {
  it("mints a timed recurrenceId as the UTC instant with milliseconds", () => {
    const id = composeOccurrenceIdFromSchedule("aaaaaaaaaaaaaaaaaaaaaaaa", {
      kind: "timed",
      start: "2026-07-14T09:00:00-06:00",
    });
    expect(decodeOccurrenceId(id)).toEqual({
      eventId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      recurrenceId: "2026-07-14T15:00:00.000Z",
    });
  });

  it("mints an all-day recurrenceId as UTC midnight of the date", () => {
    const id = composeOccurrenceIdFromSchedule("aaaaaaaaaaaaaaaaaaaaaaaa", {
      kind: "allDay",
      start: "2026-07-30",
    });
    expect(decodeOccurrenceId(id)).toEqual({
      eventId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      recurrenceId: "2026-07-30T00:00:00.000Z",
    });
  });

  it("produces a decodable id for every case — the regression lock for the codec split", () => {
    const cases = [
      { kind: "timed" as const, start: "2026-01-01T00:00:00.000Z" },
      { kind: "timed" as const, start: "2026-12-31T23:59:59+05:30" },
      { kind: "allDay" as const, start: "2026-02-28" },
      { kind: "allDay" as const, start: "2026-12-31" },
    ];
    for (const schedule of cases) {
      const id = composeOccurrenceIdFromSchedule(objectId(), schedule);
      expect(decodeOccurrenceId(id)).not.toBeNull();
    }
  });
});
