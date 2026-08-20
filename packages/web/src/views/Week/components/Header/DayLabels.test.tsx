import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import {
  getEffectiveTimeZone,
  resetEffectiveTimeZoneStoreForTests,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { DayLabels } from "@web/views/Week/components/Header/DayLabels";
import { afterEach, describe, expect, it } from "bun:test";

const monday = dayjs("2026-08-17T12:00:00.000Z");

describe("DayLabels", () => {
  afterEach(() => {
    resetEffectiveTimeZoneStoreForTests();
  });

  it("shows the effective timezone in the grid corner", () => {
    render(
      <DayLabels
        startOfView={monday.startOf("week")}
        today={monday}
        week={monday.week()}
        weekDays={[monday, monday.add(1, "day"), monday.add(2, "day")]}
      />,
    );

    const abbreviation = formatTimeZoneAbbreviation(getEffectiveTimeZone());
    expect(
      screen.getByRole("button", {
        name: `Calendar timezone: ${abbreviation}`,
      }),
    ).toHaveTextContent(abbreviation);
  });
});
