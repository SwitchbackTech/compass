import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  type CalendarId,
  CalendarIdSchema,
  type EventId,
  EventIdSchema,
} from "@core/types/domain-primitives";
import { CreateEventInputSchema } from "@core/types/event-command.contracts";
import { parseEventDraft } from "@web/events/event-draft.parser";
import {
  type EditEventDraft,
  type EditEventFormValues,
  type EventScheduleDraft,
  type NewEventDraft,
  type NewEventFormValues,
} from "@web/events/event-draft.types";

const calendarId = (): CalendarId =>
  CalendarIdSchema.parse(faker.database.mongodbObjectId());
const eventId = (): EventId =>
  EventIdSchema.parse(faker.database.mongodbObjectId());

const timedSchedule = (
  overrides: Partial<Extract<EventScheduleDraft, { kind: "timed" }>> = {},
): EventScheduleDraft => ({
  kind: "timed",
  start: new Date("2026-07-14T09:00:00-06:00"),
  end: new Date("2026-07-14T10:00:00-06:00"),
  timeZone: "America/Denver",
  ...overrides,
});

const allDaySchedule = (
  overrides: Partial<Extract<EventScheduleDraft, { kind: "allDay" }>> = {},
): EventScheduleDraft => ({
  kind: "allDay",
  start: new Date(2026, 6, 14),
  end: new Date(2026, 6, 14),
  ...overrides,
});

const somedaySchedule = (
  overrides: Partial<Extract<EventScheduleDraft, { kind: "someday" }>> = {},
): EventScheduleDraft => ({
  kind: "someday",
  period: "week",
  anchorDate: new Date(2026, 6, 14),
  sortOrder: 0,
  ...overrides,
});

const newFormValues = (
  overrides: Partial<NewEventFormValues> = {},
): NewEventFormValues => ({
  title: "Standup",
  description: "",
  schedule: timedSchedule(),
  priority: Priorities.UNASSIGNED,
  calendarId: calendarId(),
  recurrence: { kind: "single" },
  ...overrides,
});

const newDraft = (
  overrides: Partial<NewEventFormValues> = {},
): NewEventDraft => ({
  mode: "create",
  values: newFormValues(overrides),
  isDirty: true,
  submitError: null,
});

const editFormValues = (
  overrides: Partial<EditEventFormValues> = {},
): EditEventFormValues => ({
  title: "Standup",
  description: "",
  schedule: timedSchedule(),
  priority: Priorities.UNASSIGNED,
  calendarId: calendarId(),
  recurrence: { kind: "preserve" },
  scope: "this",
  ...overrides,
});

const editDraft = (
  overrides: Partial<EditEventFormValues> = {},
  draftOverrides: Partial<Omit<EditEventDraft, "values" | "mode">> = {},
): EditEventDraft => ({
  mode: "edit",
  values: editFormValues(overrides),
  isDirty: true,
  submitError: null,
  eventId: eventId(),
  originalCalendarId: calendarId(),
  ...draftOverrides,
});

describe("parseEventDraft", () => {
  describe("happy paths", () => {
    it("parses a timed create draft with the offset for the draft's time zone", () => {
      const result = parseEventDraft(newDraft());

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "create")
        throw new Error("expected create");

      expect(result.input.schedule.kind).toBe("timed");
      if (result.input.schedule.kind !== "timed")
        throw new Error("expected timed");
      expect(result.input.schedule.start).toContain("-06:00");
      expect(result.input.schedule.end).toContain("-06:00");
      expect(CreateEventInputSchema.parse(result.input)).toBeTruthy();
    });

    it("normalizes a same-day all-day selection to an exclusive end", () => {
      const result = parseEventDraft(newDraft({ schedule: allDaySchedule() }));

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "create")
        throw new Error("expected create");
      expect(result.input.schedule).toEqual({
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-15",
      });
      expect(CreateEventInputSchema.parse(result.input)).toBeTruthy();
    });

    it("passes a multi-day all-day selection through unchanged", () => {
      const schedule = allDaySchedule({ end: new Date(2026, 6, 16) });
      const result = parseEventDraft(newDraft({ schedule }));

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "create")
        throw new Error("expected create");
      expect(result.input.schedule).toEqual({
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-16",
      });
    });

    it("parses a someday create draft", () => {
      const result = parseEventDraft(newDraft({ schedule: somedaySchedule() }));

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "create")
        throw new Error("expected create");
      expect(result.input.schedule).toEqual({
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-14",
        sortOrder: 0,
      });
    });

    it("parses an edit draft that preserves recurrence and scope", () => {
      const draft = editDraft({ scope: "this" });
      const result = parseEventDraft(draft);

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "edit")
        throw new Error("expected edit");
      expect(result.input.recurrence).toEqual({ kind: "preserve" });
      expect(result.input.scope).toBe("this");
      expect(result.eventId).toBe(draft.eventId);
    });

    it("parses an edit draft that switches to series rules", () => {
      const draft = editDraft({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=DAILY"] },
      });
      const result = parseEventDraft(draft);

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "edit")
        throw new Error("expected edit");
      expect(result.input.recurrence).toEqual({
        kind: "series",
        rules: ["RRULE:FREQ=DAILY"],
      });
    });

    it("parses a create draft with series recurrence", () => {
      const draft = newDraft({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      });
      const result = parseEventDraft(draft);

      expect(result.ok).toBe(true);
      if (!result.ok || result.mode !== "create")
        throw new Error("expected create");
      expect(result.input.recurrence).toEqual({
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY"],
      });
      expect(CreateEventInputSchema.parse(result.input)).toBeTruthy();
    });
  });

  describe("failures", () => {
    it("reports a null start", () => {
      const result = parseEventDraft(
        newDraft({ schedule: timedSchedule({ start: null }) }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.start).toBeDefined();
    });

    it("reports a null time zone", () => {
      const result = parseEventDraft(
        newDraft({ schedule: timedSchedule({ timeZone: null }) }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.timeZone).toBeDefined();
    });

    it("reports a timed end before start", () => {
      const result = parseEventDraft(
        newDraft({
          schedule: timedSchedule({
            start: new Date("2026-07-14T10:00:00-06:00"),
            end: new Date("2026-07-14T09:00:00-06:00"),
          }),
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.end).toBeDefined();
    });

    it("reports an all-day end before start", () => {
      const result = parseEventDraft(
        newDraft({
          schedule: allDaySchedule({
            start: new Date(2026, 6, 14),
            end: new Date(2026, 6, 13),
          }),
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.end).toBeDefined();
    });

    it("reports a null priority", () => {
      const result = parseEventDraft(newDraft({ priority: null }));

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.priority).toBeDefined();
    });

    it("reports a null calendarId on create", () => {
      const result = parseEventDraft(newDraft({ calendarId: null }));

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.calendarId).toBeDefined();
    });

    it("reports blank series rules", () => {
      const result = parseEventDraft(
        newDraft({ recurrence: { kind: "series", rules: [""] } }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.recurrence).toBeDefined();
    });

    it("reports a missing someday sortOrder", () => {
      const result = parseEventDraft(
        newDraft({ schedule: somedaySchedule({ sortOrder: null }) }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.sortOrder).toBeDefined();
    });

    it("reports every simultaneous error in one result", () => {
      const result = parseEventDraft(
        newDraft({
          calendarId: null,
          priority: null,
          schedule: timedSchedule({ start: null, timeZone: null }),
        }),
      );

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.fieldErrors.calendarId).toBeDefined();
      expect(result.fieldErrors.priority).toBeDefined();
      expect(result.fieldErrors.start).toBeDefined();
      expect(result.fieldErrors.timeZone).toBeDefined();
    });
  });
});
