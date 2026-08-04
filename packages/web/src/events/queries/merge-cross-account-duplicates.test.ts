import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { mergeCrossAccountDuplicates } from "./merge-cross-account-duplicates";
import { describe, expect, it } from "bun:test";

const calendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

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
    expect(mergeCrossAccountDuplicates(data, undefined).data).toBe(data);
  });

  it("merges the same meeting on two accounts into one event", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const { data } = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(data?.ids).toEqual([onWork.id]);
    expect(data?.entities[onPersonal.id]).toBeUndefined();
  });

  it("reports the other account and its calendar colour for the survivor", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const { duplicates } = mergeCrossAccountDuplicates(
      dataOf(onWork, onPersonal),
      [work, personal],
    );

    // The grid decorates the winning copy with the other calendar's colour;
    // there is no synthetic merged event.
    expect(duplicates.get(onWork.id)).toEqual({
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

    const { data } = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(data?.ids).toHaveLength(2);
  });

  it("keeps both copies when they share an account", () => {
    // An invite plus a copy the user made on another of their own calendars
    // is not a cross-account duplicate.
    const otherWorkCalendar = calendar({ accountEmail: "ahab@pequod.com" });
    const first = copy(work);
    const second = copy(otherWorkCalendar);

    const { data } = mergeCrossAccountDuplicates(dataOf(first, second), [
      work,
      otherWorkCalendar,
    ]);

    expect(data?.ids).toHaveLength(2);
  });

  it("keeps both copies when they carry different correlation keys", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal, { icalUid: "different@google.com" });

    const { data } = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(data?.ids).toHaveLength(2);
  });

  it("never merges events with no correlation key", () => {
    // Two uncorrelated events at the same time must not collapse: an absent
    // key is not a key that happens to be equal.
    const onWork = copy(work, { icalUid: undefined });
    const onPersonal = copy(personal, { icalUid: undefined });

    const { data } = mergeCrossAccountDuplicates(dataOf(onWork, onPersonal), [
      work,
      personal,
    ]);

    expect(data?.ids).toHaveLength(2);
  });

  it("keeps the copy on the default calendar's account", () => {
    const onWork = copy(work);
    const onPersonal = copy(personal);

    const { data, duplicates } = mergeCrossAccountDuplicates(
      dataOf(onWork, onPersonal),
      // work sorts first, so only the default-account preference can make
      // the personal copy win.
      [work, personal],
      "ahab@gmail.com",
    );

    expect(data?.ids).toEqual([onPersonal.id]);
    expect(duplicates.get(onPersonal.id)?.accountEmail).toBe("ahab@pequod.com");
  });

  it("leaves a single copy untouched, returning the same data reference", () => {
    const data = dataOf(copy(work));

    expect(mergeCrossAccountDuplicates(data, [work, personal]).data).toBe(data);
  });

  it("reuses the cached result for the same data and calendars", () => {
    const data = dataOf(copy(work), copy(personal));

    const first = mergeCrossAccountDuplicates(data, [work, personal]);
    const calendarsRef = [work, personal];
    const second = mergeCrossAccountDuplicates(data, calendarsRef);
    const third = mergeCrossAccountDuplicates(data, calendarsRef);

    // Same (data, calendars) references must not re-derive; a fresh object
    // each call would defeat the view model's own WeakMap downstream.
    expect(third.data).toBe(second.data);
    expect(first.data).not.toBe(second.data);
  });
});
