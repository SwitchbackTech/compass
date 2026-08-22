import { type FC } from "react";
import { type GridEvent as GridEventEntity } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { focusEventFormTitle } from "@web/common/utils/form/form.util";
import { gridEventDraftToGridEvent } from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  isEventFormOpen,
  selectDraftActivity,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  draftToAllDayRowGridEvent,
  isDraftRenderedInAllDayRow,
} from "@web/grid/layout/all-day-draft.position";
import { type TimedDeckLayout } from "@web/grid/layout/timed-deck.layout";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { GridEvent } from "@web/views/Week/components/Event/Grid/GridEvent/GridEvent";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { getWeekInteractionTargetAttributes } from "@web/views/Week/interaction/registry/week-event.registry";

interface Props {
  activeAllDayDraftEvent?: GridEventEntity | null;
  deckLayout?: TimedDeckLayout | null;
  measurements: Measurements_Grid;
  recurringPreviews?: readonly GridEventEntity[];
  weekProps: WeekProps;
}

const openDraftFormOrFocusTitle = () => {
  if (!isEventFormOpen()) {
    draftActions.setFormOpen(true);
    return;
  }
  focusEventFormTitle();
};

export const GridDraft: FC<Props> = ({
  activeAllDayDraftEvent = null,
  deckLayout = null,
  measurements,
  recurringPreviews = [],
  weekProps,
}) => {
  const { state } = useDraftContext();
  const { draft, dragOffset, isDragging, isResizing } = state;
  // A live drag-create looks like a resize: the user is dragging one edge of
  // the draft. It just isn't a local resize, so `isResizing` stays false.
  const isCreating = useDraftStore(selectDraftActivity) === "creating";

  // Direct GridEventDraft → GridEvent for card renderers; live dragOffset is
  // applied onto the default position without a CompassEvent hop.
  const draftAsGridEvent: GridEventEntity | null = draft
    ? {
        ...gridEventDraftToGridEvent(draft),
        position: { ...gridEventDefaultPosition, dragOffset },
      }
    : null;

  const motionMode =
    isResizing || isCreating ? "resizing" : isDragging ? "dragging" : "idle";

  const rendersInAllDayRow = draft ? isDraftRenderedInAllDayRow(draft) : false;

  if (!draft || !draftAsGridEvent) return null;

  const allDayDraftEvent = rendersInAllDayRow
    ? (activeAllDayDraftEvent ?? draftToAllDayRowGridEvent(draft))
    : draftAsGridEvent;

  const draftEventType = rendersInAllDayRow ? "all-day" : "timed";
  // `data-grid-event-surface` lets post-close focus restore skip this portal
  // node — it shares the saved event's interaction id but unmounts on discard.
  const draftInteractionAttributes = draftAsGridEvent._id
    ? {
        ...getWeekInteractionTargetAttributes({
          eventId: draftAsGridEvent._id,
          eventType: draftEventType,
        }),
        "data-grid-event-surface": "draft",
      }
    : undefined;

  return (
    <>
      {/* Read-only previews of the other recurrence occurrences in view. They
          take no handlers, so TimedEventCard swallows clicks — only the
          canonical draft below is interactive. */}
      {recurringPreviews.map((preview) => (
        <GridEvent
          displayMode="draft"
          event={preview}
          interactionAttributes={
            preview._id
              ? getWeekInteractionTargetAttributes({
                  eventId: preview._id,
                  eventType: "timed",
                })
              : undefined
          }
          key={`draft-preview-${preview.startDate}`}
          measurements={measurements}
          weekProps={weekProps}
        />
      ))}

      {rendersInAllDayRow ? (
        <AllDayEventMemo
          event={allDayDraftEvent}
          interactionAttributes={draftInteractionAttributes}
          isPlaceholder={false}
          key={`draft-${draftAsGridEvent._id}`}
          measurements={measurements}
          onKeyDown={openDraftFormOrFocusTitle}
          weekDays={weekProps.component.weekDays}
        />
      ) : (
        <GridEvent
          deckLayout={deckLayout}
          displayMode="draft"
          event={draftAsGridEvent}
          interactionAttributes={draftInteractionAttributes}
          key={`draft-${draftAsGridEvent._id}`}
          measurements={measurements}
          motionMode={motionMode}
          onEventKeyDown={openDraftFormOrFocusTitle}
          weekProps={weekProps}
        />
      )}
    </>
  );
};
