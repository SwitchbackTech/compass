import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { type Event } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { parseEventDraft } from "@web/events/event-draft.parser";
import {
  type EditEventDraft,
  type EventDraft,
} from "@web/events/event-draft.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

const date = (value: string) => new Date(value);

const toDraft = (
  event: Event,
  mode: "create" | "edit",
  scope: RecurrenceScope,
): EventDraft => {
  const schedule =
    event.schedule.kind === "someday"
      ? {
          kind: "someday" as const,
          period: event.schedule.period,
          anchorDate: date(event.schedule.anchorDate),
          sortOrder: event.schedule.sortOrder,
        }
      : event.schedule.kind === "allDay"
        ? {
            kind: "allDay" as const,
            start: date(event.schedule.start),
            end: date(event.schedule.end),
          }
        : {
            kind: "timed" as const,
            start: date(event.schedule.start),
            end: date(event.schedule.end),
            timeZone: event.schedule.timeZone,
          };
  const content =
    event.content.kind === "details"
      ? event.content
      : { kind: "details" as const, title: "", description: "" };

  if (mode === "create") {
    return {
      mode,
      isDirty: true,
      submitError: null,
      values: {
        title: content.title,
        description: content.description,
        schedule,
        priority: event.priority,
        calendarId: event.calendarId,
        recurrence:
          event.recurrence.kind === "series"
            ? { kind: "series", rules: [...event.recurrence.rules] }
            : { kind: "single" },
      },
    };
  }

  const draft: EditEventDraft = {
    mode,
    eventId: event.id,
    originalCalendarId: event.calendarId,
    isDirty: true,
    submitError: null,
    values: {
      title: content.title,
      description: content.description,
      schedule,
      priority: event.priority,
      calendarId: event.calendarId,
      recurrence: { kind: "preserve" },
      scope,
    },
  };
  return draft;
};

export function useSaveEventForm() {
  const closeEventForm = useCloseEventForm();
  const queryClient = useQueryClient();
  const { create, replace } = useEventMutations();

  return useCallback(
    (event: Event | null, applyTo: RecurrenceScope = "this") => {
      if (!event) return closeEventForm();
      const existing = Boolean(findEventInCache(queryClient, event.id));
      const draft = toDraft(event, existing ? "edit" : "create", applyTo);
      const parsed = parseEventDraft(draft);
      if (!parsed.ok) return;
      if (parsed.mode === "create") create(parsed.input);
      else replace({ id: parsed.eventId, input: parsed.input });
      closeEventForm();
    },
    [closeEventForm, create, queryClient, replace],
  );
}
