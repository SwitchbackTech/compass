import { render, screen } from "@testing-library/react";
import { createMockCalendar } from "@web/__tests__/utils/factories/calendar.factory";
import {
  getEffectiveTimeZone,
  resetEffectiveTimeZoneStoreForTests,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { DayCalendarColumnHeaders } from "@web/views/Day/components/Calendar/DayCalendarColumnHeaders";
import { afterEach, describe, expect, it } from "bun:test";

const calendar = createMockCalendar({ name: "Personal" });

describe("DayCalendarColumnHeaders", () => {
  afterEach(() => {
    resetEffectiveTimeZoneStoreForTests();
  });

  it("shows the effective timezone in the grid corner", () => {
    render(<DayCalendarColumnHeaders calendars={[calendar]} />);

    const abbreviation = formatTimeZoneAbbreviation(getEffectiveTimeZone());
    expect(
      screen.getByRole("button", {
        name: `Calendar timezone: ${abbreviation}`,
      }),
    ).toHaveTextContent(abbreviation);
    expect(screen.getByRole("region", { name: "Calendars" })).toHaveTextContent(
      "Personal",
    );
  });
});
