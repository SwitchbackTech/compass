import { useQueryClient } from "@tanstack/react-query";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  type EventFormFocusField,
  focusEventFormField,
} from "@web/common/utils/form/form.util";
import { createGridEventDraftFromGridEvent } from "@web/events/grid-event-draft.adapter";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import {
  draftActions,
  isEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  findCalendarEventForTarget,
  type GridEventShortcutTarget,
} from "@web/grid/shortcuts/focus-adjacent-grid-event";
import { useEditSequenceShortcut } from "@web/shortcuts/useEditSequenceShortcut";

const focusFieldAfterPaint = (field: EventFormFocusField) => {
  // Form mount + title autoFocus both land after the current frame; wait two
  // paints so sequences other than title can steal focus from autoFocus.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      focusEventFormField(field);
    });
  });
};

/**
 * `e` then `t`/`d`/`s`/`e`/`r`/`c`: open the focused event's form (if needed)
 * and move caret/focus to the matching field. Shared by Day and Week.
 */
export function useGridEventFormFieldSequences({
  allDayEvents = [],
  targeting,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  targeting: {
    getFocused: () => GridEventShortcutTarget | null;
  };
  timedEvents: GridEvent[];
}) {
  const queryClient = useQueryClient();

  const draftAlreadyOpenForEvent = (eventId: string) => {
    if (!isEventFormOpen()) return false;
    const draft = useDraftStore.getState().gridDraft;
    if (!draft) return false;
    if (draft.kind === "edit") {
      return draft.source.id === eventId;
    }
    return draft.clientId === eventId;
  };

  const openFocusedEventFormField = (field: EventFormFocusField) => {
    const target = targeting.getFocused();
    if (!target) return;

    const gridEvent = findCalendarEventForTarget(target, {
      allDayEvents,
      timedEvents,
    });
    if (!gridEvent?._id) return;

    if (!draftAlreadyOpenForEvent(gridEvent._id)) {
      const sourceEvent = findEventInCache(queryClient, gridEvent._id);
      const draft = createGridEventDraftFromGridEvent(gridEvent, sourceEvent);
      if (!draft) return;

      draftActions.startGridDraft({ activity: "keyboardEdit", draft });
      draftActions.setFormOpen(true);
      focusFieldAfterPaint(field);
      return;
    }

    focusEventFormField(field);
  };

  useEditSequenceShortcut({
    onSequence: openFocusedEventFormField,
  });
}
