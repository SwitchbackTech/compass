import { type Calendar } from "@core/types/calendar.contracts";
import { getDayViewCalendars } from "./dayCalendarColumns.util";
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

describe("getDayViewCalendars", () => {
  it("keeps the local calendar when no account is connected", () => {
    const local = makeCalendar({ provider: "local", name: "Compass" });
    const google = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
      name: "primary",
    });

    expect(getDayViewCalendars([local, google])).toEqual([local, google]);
  });

  it("drops the local calendar once an account is connected", () => {
    const local = makeCalendar({ provider: "local", name: "Compass" });
    const google = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
      name: "primary",
    });

    expect(
      getDayViewCalendars([local, google], { hasConnectedAccount: true }),
    ).toEqual([google]);
  });

  it("falls back to the primary among remaining calendars when none are visible", () => {
    const local = makeCalendar({
      provider: "local",
      name: "Compass",
      isVisible: false,
    });
    const primaryGoogle = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439012" as Calendar["id"],
      name: "primary",
      isPrimary: true,
      isVisible: false,
    });
    const secondaryGoogle = makeCalendar({
      provider: "google",
      id: "507f1f77bcf86cd799439013" as Calendar["id"],
      name: "secondary",
      isVisible: false,
    });

    expect(
      getDayViewCalendars([local, secondaryGoogle, primaryGoogle], {
        hasConnectedAccount: true,
      }),
    ).toEqual([primaryGoogle]);
  });

  it("does not fall back to the local calendar when an account is connected", () => {
    const local = makeCalendar({
      provider: "local",
      name: "Compass",
      isPrimary: true,
      isVisible: false,
    });

    expect(getDayViewCalendars([local], { hasConnectedAccount: true })).toEqual(
      [],
    );
  });
});
