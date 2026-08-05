import { type Calendar } from "@core/types/calendar.contracts";
import { type Event } from "@core/types/event.contracts";
import { createMockCalendar as calendar } from "@web/__tests__/utils/factories/calendar.factory";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { mergeCrossAccountDuplicates } from "./merge-cross-account-duplicates";
import { describe, expect, it } from "bun:test";

// The schedule fields are branded strings; one cast here keeps every test
// below reading as plain literals.
const slot = (start: string, end: string): Event["schedule"] =>
  ({ kind: "timed", start, end, timeZone: "UTC" }) as Event["schedule"];

const SLOT = slot("2026-08-04T15:00:00+00:00", "2026-08-04T16:00:00+00:00");

const copy = (
  cal: Calendar,
  overrides: Partial<Event> & { schedule?: Event["schedule"] } = {},
): Event =>
  ({
    ...createMockEvent({ calendarId: cal.id }),
    schedule: SLOT,
    icalUid: "meeting@google.com",
    ...overrides,
  }) as Event;

const dataOf = (...events: Event[]) => ({
  ids: events.map((event) => event.id),
  entities: Object.fromEntries(events.map((event) => [event.id, event])),
});

describe("mergeCrossAccountDuplicates", () => {
  const work = calendar({ accountEmail: "ahab@pequod.com" });
  const personal = calendar({
    accountEmail: "ahab@gmail.com",
    backgroundColor: "#ef4444",
  });

  it("passes data through when calendars have not loaded", () => {
    const data = dataOf(copy(work));
    expect(mergeCrossAccountDuplicates(data, undefined)).toBe(data);
  });

  it("passes data through untouched with a single connected account", () => {
    // The overwhelmingly common case: no second account means no duplicate is
    // possible, so the per-event pass must not run at all - same reference
    // back, no annotation.
    const data = dataOf(copy(work), copy(work));
    const sameAccountOnly = [
      work,
      calendar({ accountEmail: work.accountEmail }),
    ];

    expect(mergeCrossAccountDuplicates(data, sameAccountOnly)).toBe(data);
  });

  it("merges the same meeting on two accounts into one event", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const merged = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(merged?.ids).toEqual([onWork.id]);
    expect(merged?.entities[onPersonal.id]).toBeUndefined();
  });

  it("stamps the other account and its calendar colour onto the data", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const merged = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    // The view model joins this onto the surviving GridEvent as
    // `otherAccount`; there is no synthetic merged event.
    expect(merged?.crossAccountDuplicates?.get(onWork.id)).toEqual({
      accountEmail: "ahab@gmail.com",
      backgroundColor: "#ef4444",
    });
  });

  it("keeps both copies when their times differ", () => {
    // One copy was genuinely moved, so they occupy different slots.
    const onWork = copy(work);
    const onPersonal = copy(personal, {
      schedule: slot("2026-08-04T17:00:00+00:00", "2026-08-04T18:00:00+00:00"),
    });

    const merged = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(merged?.ids).toHaveLength(2);
  });

  it("keeps both copies when they share an account", () => {
    // An invite plus a copy the user made on another of their own calendars
    // is not a cross-account duplicate. A calendar on a second account is
    // present so the single-account early-out does not mask the rule.
    const otherWorkCalendar = calendar({ accountEmail: "ahab@pequod.com" });
    const first = copy(work);
    const second = copy(otherWorkCalendar);

    const merged = mergeCrossAccountDuplicates(dataOf(first, second), [
      work,
      otherWorkCalendar,
      personal,
    ]);

    expect(merged?.ids).toHaveLength(2);
  });

  it("keeps both copies when they carry different correlation keys", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal, { icalUid: "different@google.com" });

    const merged = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(merged?.ids).toHaveLength(2);
  });

  it("never merges events with no correlation key", () => {
    // Two uncorrelated events at the same time must not collapse: an absent
    // key is not a key that happens to be equal.
    const onWork = copy(work, { icalUid: undefined });
    const onPersonal = copy(personal, { icalUid: undefined });

    const merged = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(merged?.ids).toHaveLength(2);
  });

  it("keeps the copy on the default calendar's account", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const merged = mergeCrossAccountDuplicates(
      dataOf(onWork, onPersonal),
      // work sorts first, so only the default-account preference can make
      // the personal copy win.
      [work, personal],
      "ahab@gmail.com",
    );

    expect(merged?.ids).toEqual([onPersonal.id]);
    expect(
      merged?.crossAccountDuplicates?.get(onPersonal.id)?.accountEmail,
    ).toBe("ahab@pequod.com");
  });

  it("returns the same data reference when nothing merges", () => {
    const data = dataOf(copy(work));

    expect(mergeCrossAccountDuplicates(data, [work, personal])).toBe(data);
  });
});
