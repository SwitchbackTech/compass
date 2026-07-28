import { normalizeStoredContent } from "./normalize-stored-content";
import { describe, expect, it } from "bun:test";

describe("normalizeStoredContent", () => {
  it("omits a null color so stored rows match the read contract", () => {
    expect(
      normalizeStoredContent({
        title: "Standup",
        description: "Daily",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: null,
      }),
    ).toEqual({
      title: "Standup",
      description: "Daily",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    });
  });

  it("keeps a real color slot", () => {
    expect(
      normalizeStoredContent({
        title: "Standup",
        description: "Daily",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: "coral",
      }),
    ).toEqual({
      title: "Standup",
      description: "Daily",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      color: "coral",
    });
  });

  it("leaves an omitted color omitted", () => {
    expect(
      normalizeStoredContent({
        title: "Standup",
        description: "Daily",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      }),
    ).not.toHaveProperty("color");
  });
});
