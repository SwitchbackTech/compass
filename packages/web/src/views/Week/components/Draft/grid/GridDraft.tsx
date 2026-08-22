import { type FC } from "react";
import { type GridEvent as GridEventEntity } from "@web/common/types/web.event.types";
import { focusEventFormTitle } from "@web/common/utils/form/form.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { gridEventDraftToGridEvent } from "@web/events/grid-event-draft.adapter";
import { draftActions, isEventFormOpen } from "@web/events/stores/draft.store";
import {
  draftToAllDayRowGridEvent,
  isDraftRenderedInAllDayRow,
} from "@web/grid/layout/all-day-draft.position";
import { type TimedDeckLayout } from "@web/grid/layout/timed-deck.layout";
import { GridEvent } from "@web/views/Week/components/Event/Grid/GridEvent/GridEvent";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { getWeekInteractionTargetAttributes } from "@web/views/Week/interaction/registry/week-event.registry";

interface Props {
  activeAllDayDraftEvent?: GridEventEntity | null;
  deckLayout?: TimedDeckLayout | null;
  draft: GridEventDraft;
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
  draft,
  measurements,
  recurringPreviews = [],
  weekProps,
}) => {
  const draftAsGridEvent = gridEventDraftToGridEvent(draft);
  const rendersInAllDayRow = isDraftRenderedInAllDayRow(draft);
  const allDayDraftEvent = rendersInAllDayRow
    ? (activeAllDayDraftEvent ?? draftToAllDayRowGridEvent(draft))
    : draftAsGridEvent;
  const draftEventType = rendersInAllDayRow ? "all-day" : "timed";
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
          onEventKeyDown={openDraftFormOrFocusTitle}
          weekProps={weekProps}
        />
      )}
    </>
  );
};
