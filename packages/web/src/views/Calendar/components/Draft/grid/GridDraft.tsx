import React, { FC, MouseEvent } from "react";
import { FloatingFocusManager } from "@floating-ui/react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { PartialMouseEvent } from "@web/common/types/util.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventDragOffset } from "@web/common/utils/event.util";
import { useGridEventMouseDown } from "@web/views/Calendar/hooks/grid/useGridEventMouseDown";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { GridEvent } from "../../Event/Grid";
import { useDraftContext } from "../context/useDraftContext";

interface Props {
  draft: Schema_GridEvent;
  isDragging: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const GridDraft: FC<Props> = ({ measurements, weekProps }) => {
  const { actions, setters, state } = useDraftContext();
  const { discard, deleteEvent, submit, startDragging } = actions;
  const { setDraft, setDateBeingChanged, setIsResizing } = setters;
  const { draft, isDragging, formProps, isFormOpen, isResizing } = state;
  const { context, getReferenceProps, getFloatingProps, x, y, refs, strategy } =
    formProps;

  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    actions.convert(start, end);
  };

  const handleClick = () => {};
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

  const { onMouseDown } = useGridEventMouseDown(
    draft?.isAllDay ? Categories_Event.ALLDAY : Categories_Event.TIMED,
    handleClick,
    handleDrag,
  );

  if (!draft) return null;

  return (
    <>
      <GridEvent
        event={draft}
        isDragging={isDragging}
        isDraft={true}
        isPlaceholder={false}
        isResizing={isResizing}
        key={`draft-${draft?._id}`}
        measurements={measurements}
        onEventMouseDown={(event: Schema_GridEvent, e: MouseEvent) => {
          e.preventDefault();
          onMouseDown(e, event);
        }}
        onScalerMouseDown={(
          event: Schema_GridEvent,
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

      <div>
        {isFormOpen && (
          <FloatingFocusManager context={context}>
            <StyledFloatContainer
              ref={refs.setFloating}
              strategy={strategy}
              top={y ?? 0}
              left={x ?? 0}
              {...getFloatingProps()}
            >
              <EventForm
                event={draft}
                onClose={discard}
                onConvert={onConvert}
                onDelete={deleteEvent}
                onSubmit={(_draft: Schema_GridEvent) => submit(_draft)}
                setEvent={setDraft}
              />
            </StyledFloatContainer>
          </FloatingFocusManager>
        )}
      </div>
    </>
  );
};
