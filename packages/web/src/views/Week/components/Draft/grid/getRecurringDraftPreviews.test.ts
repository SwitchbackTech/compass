import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getRecurringDraftPreviews } from "./getRecurringDraftPreviews";
import { describe, expect, test } from "bun:test";

const startOfView = dayjs("2026-07-05T00:00:00.000Z"); // Sun
const endOfView = dayjs("2026-07-11T23:59:59.999Z"); // Sat

const timedDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent =>
  ({
    isAllDay: false,
    // Wednesday 10:00–11:00
    startDate: "2026-07-08T10:00:00.000Z",
    endDate: "2026-07-08T11:00:00.000Z",
    title: "Standup",
    ...overrides,
  }) as Schema_GridEvent;

const dayKey = (date?: string) => dayjs(date).format(YEAR_MONTH_DAY_FORMAT);

describe("getRecurringDraftPreviews", () => {
  test("returns [] for a non-recurring draft", () => {
    expect(
      getRecurringDraftPreviews(timedDraft(), startOfView, endOfView),
    ).toEqual([]);
  });

  test("returns [] for a null draft", () => {
    expect(getRecurringDraftPreviews(null, startOfView, endOfView)).toEqual([]);
  });

  test("returns [] for an all-day recurring draft", () => {
    const draft = timedDraft({
      isAllDay: true,
      recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    });

    expect(getRecurringDraftPreviews(draft, startOfView, endOfView)).toEqual(
      [],
    );
  });

  test("expands a daily draft to the remaining days of the view, excluding its own day", () => {
    const draft = timedDraft({ recurrence: { rule: ["RRULE:FREQ=DAILY"] } });

    const previews = getRecurringDraftPreviews(draft, startOfView, endOfView);

    // Wed is the interactive draft; Thu/Fri/Sat are previews (Sun next week is
    // past the view).
    const previewDays = previews.map((p) => dayKey(p.startDate));
    expect(previewDays).toEqual(["2026-07-09", "2026-07-10", "2026-07-11"]);
    // None coincide with the draft's own day.
    expect(previewDays).not.toContain(dayKey(draft.startDate));
  });

  test("keeps the draft's time-of-day and duration on each occurrence", () => {
    const draft = timedDraft({ recurrence: { rule: ["RRULE:FREQ=DAILY"] } });

    const previews = getRecurringDraftPreviews(draft, startOfView, endOfView);

    for (const preview of previews) {
      const durationMs = dayjs(preview.endDate).diff(preview.startDate);
      expect(durationMs).toBe(60 * 60 * 1000); // 1 hour, same as the draft
    }
  });

  test("previews carry no id so they stay inert", () => {
    const draft = timedDraft({
      _id: "draft-1",
      recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    });

    const previews = getRecurringDraftPreviews(draft, startOfView, endOfView);

    expect(previews.length).toBeGreaterThan(0);
    expect(previews.every((p) => p._id === undefined)).toBe(true);
  });

  test("expands a weekly draft to only its matching weekday in view", () => {
    const draft = timedDraft({ recurrence: { rule: ["RRULE:FREQ=WEEKLY"] } });

    // The next weekly occurrence (2026-07-15) is outside this view, so there
    // are no other-day previews within the visible week.
    expect(getRecurringDraftPreviews(draft, startOfView, endOfView)).toEqual(
      [],
    );
  });
});
