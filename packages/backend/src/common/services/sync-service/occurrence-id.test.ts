import { faker } from "@faker-js/faker";
import { composeOccurrenceId, decodeOccurrenceId } from "./occurrence-id";
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
    // A single or series-master row carries a bare event id — not an occurrence.
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
});
