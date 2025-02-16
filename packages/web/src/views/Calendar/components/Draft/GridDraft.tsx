import React, { FC, MouseEvent } from "react";
import { FloatingFocusManager } from "@floating-ui/react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { EventForm } from "@web/views/Forms/EventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GridEvent } from "../Event/Grid";
import { useDraftContext } from "./context/useDraftContext";

interface Props {
  draft: Schema_GridEvent;
  isDragging: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const GridDraft: FC<Props> = ({ measurements, weekProps }) => {
  const { actions, setters, state } = useDraftContext();
  const { discard, deleteEvent, submit } = actions;
  const { setDraft, setDateBeingChanged, setIsDragging, setIsResizing } =
    setters;
  const { draft, isDragging, formProps, isFormOpen, isResizing } = state;
  const { context, getReferenceProps, getFloatingProps, x, y, refs, strategy } =
    formProps;

  console.log("isFormOpen?", isFormOpen);
  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    actions.convert(start, end);
  };

  if (!draft) return null;
  if (!draft) console.log("draft is null");

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
        onClick={() => console.log("clicked")}
        onEventMouseDown={(event: Schema_GridEvent, e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          setIsDragging(true);
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
        {/* {isFormOpen && ( */}
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
        {/* )} */}
      </div>
    </>
  );
};
