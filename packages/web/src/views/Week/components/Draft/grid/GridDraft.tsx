import { type FC, type MouseEvent } from "react";
import { Origin } from "@core/constants/core.constants";
import { type LegacyEvent } from "@core/types/legacy-event.contracts";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  Categories_Event,
  type GridEvent as GridEventEntity,
} from "@web/common/types/web.event.types";
import {
  getEventDragOffset,
  gridEventDefaultPosition,
} from "@web/common/utils/event/event.util";
import { focusEventFormTitle } from "@web/common/utils/form/form.util";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { type CalendarTimedDeckLayout } from "@web/layout/calendar-grid/layout/calendarTimedDeckLayout";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { GridEvent } from "@web/views/Week/components/Event/Grid/GridEvent/GridEvent";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { useGridEventMouseDown } from "@web/views/Week/hooks/grid/useGridEventMouseDown";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  activeAllDayDraftEvent?: GridEventEntity | null;
  deckLayout?: CalendarTimedDeckLayout | null;
  measurements: Measurements_Grid;
  recurringPreviews?: readonly GridEventEntity[];
  weekProps: WeekProps;
}

const handleGridDraftClick = () => {};

export const GridDraft: FC<Props> = ({
  activeAllDayDraftEvent = null,
  deckLayout = null,
  measurements,
  recurringPreviews = [],
  weekProps,
}) => {
  const { actions, setters, state } = useDraftContext();
  const { startDragging } = actions;
  const { setDragOffset, setDateBeingChanged, setIsResizing } = setters;
  const { draft, dragOffset, isDragging, isResizing } = state;

  // GridEvent-shaped projection of the canonical GridEventDraft, for
  // the still-unconverted renderer components (GridEvent/AllDayEventMemo)
  // and the forms cluster (EventForm/RecurrenceSection) — see
  // grid-event-draft.adapter.ts's gridEventDraftToSchemaEvent doc comment.
  const draftSchemaEvent: LegacyEvent | null = draft
    ? gridEventDraftToSchemaEvent(draft)
    : null;
  const draftAsGridEvent: GridEventEntity | null = draftSchemaEvent
    ? ({
        ...draftSchemaEvent,
        origin: draftSchemaEvent.origin ?? Origin.COMPASS,
        user: draftSchemaEvent.user ?? "",
        position: { ...gridEventDefaultPosition, dragOffset },
      } as GridEventEntity)
    : null;

  const handleDrag = (_: GridEventEntity, moveEvent: PartialMouseEvent) => {
    if (!draft) return; // TS Guard

    setDragOffset(getEventDragOffset(draftAsGridEvent ?? undefined, moveEvent));
    startDragging();
  };

  const motionMode = isResizing ? "resizing" : isDragging ? "dragging" : "idle";

  const { onMouseDown } = useGridEventMouseDown(
    draft?.values.schedule.kind === "allDay"
      ? Categories_Event.ALLDAY
      : Categories_Event.TIMED,
    handleGridDraftClick,
    handleDrag,
  );

  if (!draft || !draftAsGridEvent) return null;

  const isAllDay = draft.values.schedule.kind === "allDay";
  const allDayDraftEvent = isAllDay
    ? (activeAllDayDraftEvent ?? draftAsGridEvent)
    : draftAsGridEvent;

  return (
    <>
      {/* Read-only previews of the other recurrence occurrences in view. They
          take no handlers, so CalendarTimedEventCard swallows clicks — only the
          canonical draft below is interactive. */}
      {recurringPreviews.map((preview) => (
        <GridEvent
          displayMode="draft"
          event={preview}
          key={`draft-preview-${preview.startDate}`}
          measurements={measurements}
          weekProps={weekProps}
        />
      ))}

      {isAllDay ? (
        <AllDayEventMemo
          event={allDayDraftEvent}
          isPlaceholder={false}
          key={`draft-${draftAsGridEvent._id}`}
          measurements={measurements}
          onKeyDown={focusEventFormTitle}
          onMouseDown={(e: MouseEvent, event: GridEventEntity) => {
            e.preventDefault();
            onMouseDown(e, event);
          }}
          onScalerMouseDown={(
            _event: GridEventEntity,
            e: MouseEvent,
            dateToChange: "startDate" | "endDate",
          ) => {
            e.stopPropagation();
            e.preventDefault();
            setDateBeingChanged(dateToChange);
            setIsResizing(true);
          }}
          weekDays={weekProps.component.weekDays}
        />
      ) : (
        <GridEvent
          deckLayout={deckLayout}
          displayMode="draft"
          event={draftAsGridEvent}
          key={`draft-${draftAsGridEvent._id}`}
          measurements={measurements}
          motionMode={motionMode}
          onEventMouseDown={(event: GridEventEntity, e: MouseEvent) => {
            e.preventDefault();
            onMouseDown(e, event);
          }}
          onEventKeyDown={focusEventFormTitle}
          onScalerMouseDown={(
            _event: GridEventEntity,
            e: MouseEvent,
            dateToChange: "startDate" | "endDate",
          ) => {
            e.stopPropagation();
            e.preventDefault();
            setDateBeingChanged(dateToChange);
            setIsResizing(true);
          }}
          weekProps={weekProps}
        />
      )}
    </>
  );
};
