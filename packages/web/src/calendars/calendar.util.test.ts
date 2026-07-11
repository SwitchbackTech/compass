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
});
