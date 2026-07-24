import { mergeUpdateContent } from "./merge-update-content";
import { describe, expect, it } from "bun:test";

describe("mergeUpdateContent", () => {
  it("updates title and description without wiping richer fields", () => {
    const existing = {
      title: "Old",
      description: "Old desc",
      location: "Room A",
      organizer: { email: "a@example.com", displayName: "A" },
      attendees: [
        {
          email: "b@example.com",
          displayName: "B",
          responseStatus: "accepted" as const,
        },
      ],
      conference: { url: "https://meet.example/x", label: "Meet" },
    };
    const incoming = {
      title: "New",
      description: "New desc",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    };

    expect(mergeUpdateContent(existing, incoming)).toEqual({
      title: "New",
      description: "New desc",
      location: "Room A",
      organizer: existing.organizer,
      attendees: existing.attendees,
      conference: existing.conference,
    });
  });
});
