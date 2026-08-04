import { type Calendar } from "@core/types/calendar.contracts";
import { getDefaultTargetCalendar, getLocalCalendar } from "./calendar.util";
import { describe, expect, it } from "bun:test";

function makeCalendar(overrides: Partial<Calendar>): Calendar {
  return {
    id: "507f1f77bcf86cd799439011" as Calendar["id"],
    name: "Cal",
    description: "",
    timeZone: null,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    provider: "local",
    access: "owner",
    capabilities: {
      canReadAvailability: true,
      canReadDetails: true,
      canWrite: true,
      canManage: false,
      canWatchEvents: false,
    },
    isPrimary: false,
    isVisible: true,
    isActive: true,
    ...overrides,
  };
}

describe("getLocalCalendar", () => {
  it("finds the local-provider calendar", () => {
    const local = makeCalendar({ provider: "local" });
    const google = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    expect(getLocalCalendar([google, local])).toBe(local);
  });

  it("returns undefined when there is no local calendar", () => {
    const google = makeCalendar({ provider: "google" });
    expect(getLocalCalendar([google])).toBeUndefined();
  });
});

describe("getDefaultTargetCalendar", () => {
  it("prefers the primary writable google calendar", () => {
    const local = makeCalendar({ provider: "local" });
    const primaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    expect(getDefaultTargetCalendar([local, primaryGoogle])).toBe(
      primaryGoogle,
    );
  });

  it("ignores a non-primary or read-only google calendar", () => {
    const local = makeCalendar({ provider: "local" });
    const secondaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: false,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    const readOnlyPrimary = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439013" as Calendar["id"],
      capabilities: {
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: false,
        canManage: false,
        canWatchEvents: true,
      },
    });
    expect(
      getDefaultTargetCalendar([local, secondaryGoogle, readOnlyPrimary]),
    ).toBe(local);
  });

  it("falls back to local when no google calendar qualifies", () => {
    const local = makeCalendar({ provider: "local" });
    expect(getDefaultTargetCalendar([local])).toBe(local);
  });

  it("returns undefined when there is no calendar at all", () => {
    expect(getDefaultTargetCalendar([])).toBeUndefined();
  });

  it("honors the user's starred calendar over the derived default", () => {
    const primaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    const starred = makeCalendar({
      provider: "google",
      isPrimary: false,
      id: "507f1f77bcf86cd799439013" as Calendar["id"],
    });

    expect(
      getDefaultTargetCalendar([primaryGoogle, starred], {
        preferredCalendarId: starred.id,
      }),
    ).toBe(starred);
  });

  it("lets the local calendar be starred explicitly", () => {
    const local = makeCalendar({ provider: "local" });
    const primaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });

    expect(
      getDefaultTargetCalendar([local, primaryGoogle], {
        preferredCalendarId: local.id,
      }),
    ).toBe(local);
  });

  it("falls back to the derived default when the starred calendar is gone", () => {
    const primaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });

    expect(
      getDefaultTargetCalendar([primaryGoogle], {
        preferredCalendarId: "507f1f77bcf86cd799439099",
      }),
    ).toBe(primaryGoogle);
  });

  it("falls back when the starred calendar is no longer writable", () => {
    const primaryGoogle = makeCalendar({
      provider: "google",
      isPrimary: true,
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    const demoted = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439013" as Calendar["id"],
      capabilities: {
        canReadAvailability: true,
        canReadDetails: true,
        canWrite: false,
        canManage: false,
        canWatchEvents: true,
      },
    });

    expect(
      getDefaultTargetCalendar([primaryGoogle, demoted], {
        preferredCalendarId: demoted.id,
      }),
    ).toBe(primaryGoogle);
  });

  it("picks the oldest-connected account's primary when two accounts each have one", () => {
    // Both are primary and writable, so without connection order this is a
    // coin flip decided by array position.
    const newerAccountPrimary = makeCalendar({
      provider: "google",
      isPrimary: true,
      accountEmail: "new@example.com",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });
    const olderAccountPrimary = makeCalendar({
      provider: "google",
      isPrimary: true,
      accountEmail: "old@example.com",
      id: "507f1f77bcf86cd799439013" as Calendar["id"],
    });

    expect(
      getDefaultTargetCalendar([newerAccountPrimary, olderAccountPrimary], {
        accountEmailOrder: ["old@example.com", "new@example.com"],
      }),
    ).toBe(olderAccountPrimary);
  });

  it("still resolves when the connection order names an account with no primary", () => {
    const primary = makeCalendar({
      provider: "google",
      isPrimary: true,
      accountEmail: "new@example.com",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
    });

    expect(
      getDefaultTargetCalendar([primary], {
        accountEmailOrder: ["old@example.com", "new@example.com"],
      }),
    ).toBe(primary);
  });
});
