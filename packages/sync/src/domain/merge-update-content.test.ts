import { mergeUpdateContent, omitNullColor } from "./merge-update-content";
import { describe, expect, it } from "bun:test";

describe("mergeUpdateContent", () => {
  it("updates title, description, and location without wiping richer fields", () => {
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
      location: "Room B",
      organizer: null,
      attendees: [],
      conference: null,
    };

    expect(mergeUpdateContent(existing, incoming)).toEqual({
      title: "New",
      description: "New desc",
      location: "Room B",
      organizer: existing.organizer,
      attendees: existing.attendees,
      conference: existing.conference,
    });
  });

  it("applies an incoming color and preserves existing color when omitted", () => {
    const existing = {
      title: "Old",
      description: "Old desc",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      color: "blue" as const,
    };

    expect(
      mergeUpdateContent(existing, {
        title: "New",
        description: "New desc",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: "coral",
      }),
    ).toEqual({
      ...existing,
      title: "New",
      description: "New desc",
      color: "coral",
    });

    expect(
      mergeUpdateContent(existing, {
        title: "New",
        description: "New desc",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      }),
    ).toEqual({
      ...existing,
      title: "New",
      description: "New desc",
    });
  });

  it("drops colorHex when a slot color is applied", () => {
    const existing = {
      title: "Labeled",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      colorHex: "#009688",
    };

    expect(
      mergeUpdateContent(existing, {
        title: "Labeled",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: "blue",
      }),
    ).toEqual({
      title: "Labeled",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      color: "blue",
    });
  });

  it("drops colorHex when clearing a prior slot color", () => {
    const existing = {
      title: "Slotted",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      color: "blue" as const,
      colorHex: "#009688",
    };

    expect(
      mergeUpdateContent(existing, {
        title: "Slotted",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: null,
      }),
    ).toEqual({
      title: "Slotted",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    });
  });

  it("keeps colorHex when drafts send null color on a hex-only event", () => {
    const existing = {
      title: "Labeled",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      colorHex: "#009688",
    };

    expect(
      mergeUpdateContent(existing, {
        title: "Labeled",
        description: "edited",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: null,
      }),
    ).toEqual({
      title: "Labeled",
      description: "edited",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      colorHex: "#009688",
    });
  });

  it("preserves colorHex when color is omitted", () => {
    const existing = {
      title: "Labeled",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      colorHex: "#009688",
    };

    expect(
      mergeUpdateContent(existing, {
        title: "Renamed",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      }),
    ).toEqual({
      ...existing,
      title: "Renamed",
    });
  });

  it("clears an existing color when the command sends null", () => {
    const existing = {
      title: "Old",
      description: "Old desc",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
      color: "blue" as const,
    };

    expect(
      mergeUpdateContent(existing, {
        title: "Old",
        description: "Old desc",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: null,
      }),
    ).toEqual({
      title: "Old",
      description: "Old desc",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    });
  });
});

describe("omitNullColor", () => {
  it("drops null color before persist", () => {
    expect(
      omitNullColor({
        title: "Standup",
        description: "Daily",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
        color: null,
      }),
    ).not.toHaveProperty("color");
  });
});
