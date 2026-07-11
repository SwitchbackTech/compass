import { Origin, Priorities } from "@core/constants/core.constants";
import {
  type CalendarId,
  type EventId,
  EventIdSchema,
} from "@core/types/domain-primitives";
import { type Event, type EventSchedule } from "@core/types/event.contracts";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import {
  type CreateEventInput,
  CreateEventInputSchema,
  type RecurrenceScope,
  type ReorderEventsInput,
  type ReplaceEventInput,
  ReplaceEventInputSchema,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";

// TODO(packet-03-phase-3c): maps the legacy recurring-edit scope enum (still
// used by the EventForm's scope-choice dialog) onto the new RecurrenceScope
// wire values, until that dialog is converted to emit RecurrenceScope
// directly.
export function legacyScopeToRecurrenceScope(
  applyTo?: RecurringEventUpdateScope,
): RecurrenceScope {
  switch (applyTo) {
    case RecurringEventUpdateScope.ALL_EVENTS:
      return "all";
    case RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS:
      return "thisAndFollowing";
    default:
      return "this";
  }
}

// TODO(packet-03-phase-3c): the grid renderer (assembleGridEvent,
// Schema_GridEvent, the sidebar Someday components) still consumes the
// legacy Schema_Event shape. This bridges the new normalized `Event` contract
// into that shape so the rendering pipeline keeps compiling/working without
// a full rewrite here; remove once 3c converts the grid + sidebar renderers
// to consume `Event` directly.
//
// Known lossy fields: `origin` (google vs. compass) and the google event id
// no longer exist on `Event` — that now lives on `Calendar`/server-only
// `externalReference` — so this always reports Origin.COMPASS and omits
// gEventId/gRecurringEventId. Consumers that branch on those fields need the
// calendar lookup 3c will wire in.
export function eventToSchemaEvent(event: Event): Schema_Event {
  const { schedule } = event;

  const startDate =
    schedule.kind === "someday" ? schedule.anchorDate : schedule.start;
  const endDate =
    schedule.kind === "someday" ? schedule.anchorDate : schedule.end;

  return {
    _id: event.id,
    title: event.content.kind === "details" ? event.content.title : "",
    description:
      event.content.kind === "details" ? event.content.description : "",
    origin: Origin.COMPASS,
    priority: event.priority,
    isAllDay: schedule.kind === "allDay",
    isSomeday: schedule.kind === "someday",
    order: schedule.kind === "someday" ? schedule.sortOrder : undefined,
    startDate,
    endDate,
    recurrence:
      event.recurrence.kind === "series"
        ? { rule: [...event.recurrence.rules], eventId: event.id }
        : event.recurrence.kind === "occurrence"
          ? { eventId: event.recurrence.seriesId }
          : undefined,
    updatedAt: event.updatedAt ?? undefined,
  };
}

// TODO(packet-03-phase-3c): the opposite direction of the bridge above, for
// call sites still submitting a legacy Schema_Event-shaped draft (grid
// create/edit forms, someday conversions) until the draft store + forms are
// converted to build EventDraft/CreateEventInput/ReplaceEventInput directly.
function buildScheduleFromLegacy(event: Schema_Event): EventSchedule | null {
  if (!event.startDate || !event.endDate) return null;

  if (event.isSomeday) {
    const diffDays =
      (Date.parse(event.endDate) - Date.parse(event.startDate)) /
      (24 * 60 * 60 * 1000);
    return {
      kind: "someday",
      period: diffDays > 7 ? "month" : "week",
      anchorDate: event.startDate.slice(0, 10),
      sortOrder: event.order ?? 0,
    } as EventSchedule;
  }

  if (event.isAllDay) {
    return {
      kind: "allDay",
      start: event.startDate.slice(0, 10),
      end: event.endDate.slice(0, 10),
    } as EventSchedule;
  }

  return {
    kind: "timed",
    start: event.startDate,
    end: event.endDate,
    timeZone: getBrowserTimeZone(),
  } as EventSchedule;
}

function legacyRecurrence(event: Schema_Event) {
  const rule = event.recurrence?.rule;
  return Array.isArray(rule) && rule.length > 0
    ? { kind: "series" as const, rules: rule }
    : { kind: "single" as const };
}

export function schemaEventToCreateInput(
  event: Schema_Event,
  calendarId: CalendarId,
): CreateEventInput | null {
  const schedule = buildScheduleFromLegacy(event);
  if (!schedule) return null;

  const id = event._id ? EventIdSchema.safeParse(event._id) : undefined;

  const parsed = CreateEventInputSchema.safeParse({
    ...(id?.success ? { id: id.data } : {}),
    calendarId,
    content: {
      kind: "details",
      title: event.title ?? "",
      description: event.description ?? "",
    },
    schedule,
    recurrence: legacyRecurrence(event),
    priority: event.priority ?? Priorities.UNASSIGNED,
  });

  return parsed.success ? parsed.data : null;
}

export function schemaEventToReplaceInput(
  event: Schema_Event,
  scope: ReplaceEventInput["scope"] = "this",
): ReplaceEventInput | null {
  const schedule = buildScheduleFromLegacy(event);
  if (!schedule) return null;

  const parsed = ReplaceEventInputSchema.safeParse({
    content: {
      kind: "details",
      title: event.title ?? "",
      description: event.description ?? "",
    },
    schedule,
    recurrence: legacyRecurrence(event),
    priority: event.priority ?? Priorities.UNASSIGNED,
    scope,
  });

  return parsed.success ? parsed.data : null;
}

// TODO(packet-03-phase-3c): full legacy-shaped `EventMutations` facade
// (create/edit/delete/convertToSomeday/convertToCalendar/deleteSomeday/
// reorderSomeday), wrapping the new create/replace/delete/transition/
// reorderSomeday mutations via the bridges above. Lets the sidebar/grid
// drag-and-drop call sites (still building Schema_Event-shaped payloads)
// keep compiling and working until they're converted to submit
// EventDraft/CreateEventInput/ReplaceEventInput/TransitionEventInput
// directly. Remove once that conversion lands.
export function createLegacyEventMutationsAdapter(
  mutations: {
    create: (input: CreateEventInput) => void;
    replace: (payload: { id: EventId; input: ReplaceEventInput }) => void;
    delete: (payload: { id: EventId; scope: RecurrenceScope }) => void;
    transition: (payload: { id: EventId; input: TransitionEventInput }) => void;
    reorderSomeday: (input: ReorderEventsInput) => void;
  },
  getDefaultTargetCalendarId: () => CalendarId | undefined,
  somedayPeriod: () => "week" | "month" = () => "week",
) {
  const create = (event: Schema_Event) => {
    const calendarId = getDefaultTargetCalendarId();
    if (!calendarId) return;
    const input = schemaEventToCreateInput(event, calendarId);
    if (input) mutations.create(input);
  };

  const editOrDelete = (
    action: "edit" | "delete" | "deleteSomeday",
    payload: {
      _id: string;
      event?: Schema_Event;
      applyTo?: RecurringEventUpdateScope;
    },
  ) => {
    const id = EventIdSchema.safeParse(payload._id);
    if (!id.success) return;
    const scope = legacyScopeToRecurrenceScope(payload.applyTo);

    if (action === "edit" && payload.event) {
      const input = schemaEventToReplaceInput(payload.event, scope);
      if (input) mutations.replace({ id: id.data, input });
      return;
    }
    mutations.delete({ id: id.data, scope });
  };

  const transition = (
    kind: "schedule" | "unschedule",
    event: Partial<Schema_Event> & { _id: string },
  ) => {
    const id = EventIdSchema.safeParse(event._id);
    if (!id.success) return;
    const legacyEvent = event as Schema_Event;
    const schedule = buildScheduleFromLegacy({
      ...legacyEvent,
      isSomeday: kind === "unschedule",
    });
    if (!schedule) return;

    if (kind === "schedule") {
      if (schedule.kind === "someday") return;
      const targetCalendarId = getDefaultTargetCalendarId();
      if (!targetCalendarId) return;
      mutations.transition({
        id: id.data,
        input: { kind: "schedule", targetCalendarId, schedule },
      });
      return;
    }

    if (schedule.kind !== "someday") return;
    mutations.transition({
      id: id.data,
      input: { kind: "unschedule", schedule },
    });
  };

  return {
    create,
    edit: (payload: {
      _id: string;
      event: Schema_Event;
      applyTo?: RecurringEventUpdateScope;
    }) => editOrDelete("edit", payload),
    delete: (payload: { _id: string; applyTo?: RecurringEventUpdateScope }) =>
      editOrDelete("delete", payload),
    deleteSomeday: (payload: {
      _id: string;
      applyTo?: RecurringEventUpdateScope;
    }) => editOrDelete("deleteSomeday", payload),
    convertToSomeday: (payload: {
      event: Partial<Schema_Event> & { _id: string };
    }) => transition("unschedule", payload.event),
    convertToCalendar: (payload: {
      event: Partial<Schema_Event> & { _id: string };
    }) => transition("schedule", payload.event),
    reorderSomeday: (order: { _id: string; order: number }[]) =>
      mutations.reorderSomeday({
        period: somedayPeriod(),
        items: order.map(({ _id, order: sortOrder }) => ({
          eventId: _id as EventId,
          sortOrder,
        })),
      }),
  };
}
