import { type CalendarId } from "@core/types/domain-primitives";
import { deriveEventListCalendarIds } from "./derive-event-list-calendar-ids";
import { describe, expect, it } from "bun:test";

const calendar = (
  id: string,
  overrides: { isActive?: boolean; isVisible?: boolean } = {},
) =>
  ({
    id: id as CalendarId,
    isActive: overrides.isActive ?? true,
    isVisible: overrides.isVisible ?? true,
  }) as never;

describe("deriveEventListCalendarIds", () => {
  it("returns undefined when calendars have not loaded", () => {
    expect(deriveEventListCalendarIds(undefined)).toBeUndefined();
  });

  it("returns only active visible calendar ids", () => {
    expect(
      deriveEventListCalendarIds([
        calendar("a"),
        calendar("b", { isVisible: false }),
        calendar("c", { isActive: false }),
      ]),
    ).toEqual(["a" as CalendarId]);
  });

  it("returns an empty list when every calendar is hidden", () => {
    expect(
      deriveEventListCalendarIds([calendar("a", { isVisible: false })]),
    ).toEqual([]);
  });
});
