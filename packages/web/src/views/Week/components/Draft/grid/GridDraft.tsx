import { FloatingFocusManager } from "@floating-ui/react";
import { type FC, type MouseEvent, useRef } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { type CalendarTimedDeckLayout } from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventDragOffset } from "@web/common/utils/event/event.util";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { GridEvent } from "@web/views/Week/components/Event/Grid/GridEvent/GridEvent";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { useGridEventMouseDown } from "@web/views/Week/hooks/grid/useGridEventMouseDown";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  activeAllDayDraftEvent?: Schema_GridEvent | null;
  deckLayout?: CalendarTimedDeckLayout | null;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

const handleGridDraftClick = () => {};

export const GridDraft: FC<Props> = ({
  activeAllDayDraftEvent = null,
  deckLayout = null,
  measurements,
  weekProps,
}) => {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { actions, setters, state, confirmation } = useDraftContext();
  const { discard, duplicateEvent, repositionDraftByKeyboard, startDragging } =
    actions;
  const { setDraft, setDateBeingChanged, setIsResizing } = setters;
  const { draft, isDragging, formProps, isFormOpen, isResizing } = state;
  const { context, getReferenceProps, getFloatingProps, x, y, refs, strategy } =
    formProps;

  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    actions.convert(start, end);
  };

  const focusTitleInput = () => {
    titleInputRef.current?.focus();
  };

  const handleDrag = (_: Schema_GridEvent, moveEvent: PartialMouseEvent) => {
    if (!draft) return; // TS Guard

    const newDraft = {
      ...draft,
      position: {
        ...draft.position,
        dragOffset: getEventDragOffset(draft, moveEvent),
        initialX: moveEvent.clientX,
        initialY: moveEvent.clientY,
      },
    };

    setDraft(newDraft);
    startDragging();
  };

  const { onSubmit, onDelete } = confirmation;
  const motionMode = isResizing ? "resizing" : isDragging ? "dragging" : "idle";

  const { onMouseDown } = useGridEventMouseDown(
    draft?.isAllDay ? Categories_Event.ALLDAY : Categories_Event.TIMED,
    handleGridDraftClick,
    handleDrag,
  );

  if (!draft) return null;

  const allDayDraftEvent = draft.isAllDay
    ? (activeAllDayDraftEvent ?? draft)
    : draft;

  return (
    <>
      {draft.isAllDay ? (
        <AllDayEventMemo
          endOfView={weekProps.component.endOfView}
          event={allDayDraftEvent}
          isPlaceholder={false}
          key={`draft-${draft?._id}`}
          measurements={measurements}
          onKeyDown={focusTitleInput}
          onMouseDown={(e: MouseEvent, event: Schema_GridEvent) => {
            e.preventDefault();
            onMouseDown(e, event);
          }}
          onScalerMouseDown={(
            _event: Schema_GridEvent,
            e: MouseEvent,
            dateToChange: "startDate" | "endDate",
          ) => {
            e.stopPropagation();
            e.preventDefault();
            setDateBeingChanged(dateToChange);
            setIsResizing(true);
          }}
          ref={refs.setReference}
          startOfView={weekProps.component.startOfView}
          {...getReferenceProps()}
        />
      ) : (
        <GridEvent
          deckLayout={deckLayout}
          displayMode="draft"
          event={draft}
          key={`draft-${draft?._id}`}
          measurements={measurements}
          motionMode={motionMode}
          onEventMouseDown={(event: Schema_GridEvent, e: MouseEvent) => {
            e.preventDefault();
            onMouseDown(e, event);
          }}
          onEventKeyDown={focusTitleInput}
          onScalerMouseDown={(
            _event: Schema_GridEvent,
            e: MouseEvent,
            dateToChange: "startDate" | "endDate",
          ) => {
            e.stopPropagation();
            e.preventDefault();
            setDateBeingChanged(dateToChange);
            setIsResizing(true);
          }}
          ref={refs.setReference}
          weekProps={weekProps}
          {...getReferenceProps()}
        />
      )}

      {isFormOpen && (
        <FloatingFocusManager
          context={context}
          modal={false}
          closeOnFocusOut={false}
        >
          <StyledFloatContainer
            ref={refs.setFloating}
            strategy={strategy}
            top={y ?? 0}
            left={x ?? 0}
            {...getFloatingProps()}
          >
            <EventForm
              event={draft as Schema_Event}
              onClose={discard}
              onConvert={onConvert}
              onDelete={onDelete}
              onDuplicate={duplicateEvent}
              onDraftTitleArrowKey={repositionDraftByKeyboard}
              isDraft={!draft._id}
              isExistingEvent={!!draft._id}
              onSubmit={(event) => {
                if (event) void onSubmit(event as Schema_GridEvent);
              }}
              setEvent={(nextEvent) => {
                const event =
                  typeof nextEvent === "function"
                    ? nextEvent(draft)
                    : nextEvent;
                setDraft(event as Schema_GridEvent | null);
              }}
              titleEditingResetKey={state.draftSessionKey}
              titleInputRef={titleInputRef}
            />
          </StyledFloatContainer>
        </FloatingFocusManager>
      )}
    </>
  );
};
