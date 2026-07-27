import { useCallback } from "react";
import { type EventColorSlot } from "@core/types/event-color.contracts";
import {
  editGridEventDraft,
  parseGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useEventById } from "@web/events/queries/useEventById";
import { draftActions } from "@web/events/stores/draft.store";

/**
 * Immediately replaces an event's color tag (or clears it with null), then
 * discards any right-click / grid draft. Used by the event context menu.
 */
export function useSetEventColor(_id: string) {
  const existingEvent = useEventById(_id);
  const { replace } = useEventMutations();

  return useCallback(
    (color: EventColorSlot | null) => {
      if (!existingEvent) return;

      const currentColor =
        existingEvent.content.kind === "details"
          ? (existingEvent.content.color ?? null)
          : null;
      if (currentColor === color) {
        draftActions.discard();
        return;
      }

      const draft = editGridEventDraft(existingEvent);
      if (!draft || draft.kind !== "edit") return;

      const parsed = parseGridEventDraft({
        ...draft,
        values: { ...draft.values, color },
      });
      if (parsed.ok && parsed.mode === "edit") {
        replace({ id: parsed.eventId, input: parsed.input });
      }
      draftActions.discard();
    },
    [existingEvent, replace],
  );
}
