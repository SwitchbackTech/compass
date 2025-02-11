import React, { FC, MouseEvent } from "react";
import { FloatingFocusManager } from "@floating-ui/react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { EventForm } from "@web/views/Forms/EventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { Util_Draft } from "@web/views/Calendar/hooks/draft/grid/useDraft";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { EventFormProps } from "@web/views/Forms/hooks/useEventForm";

import { GridEvent } from "../Grid";

interface Props {
  draft: Schema_GridEvent;
  draftUtil: Util_Draft["draftUtil"];
  formProps: EventFormProps;
  isDragging: boolean;
  isFormOpen: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const GridDraft: FC<Props> = ({
  draft,
  draftUtil,
  formProps,
  isDragging,
  isFormOpen,
  isResizing,
  measurements,
  weekProps,
}) => {
  const { context, getReferenceProps, getFloatingProps, refs, strategy, x, y } =
    formProps;

  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    draftUtil.convert(start, end);
  };

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
          e.stopPropagation();
          e.preventDefault();
          draftUtil.setIsDragging(true);
        }}
        onScalerMouseDown={(
          event: Schema_GridEvent,
          e: MouseEvent,
          dateToChange: "startDate" | "endDate"
        ) => {
          e.stopPropagation();
          e.preventDefault();
          draftUtil.setDateBeingChanged(dateToChange);
          draftUtil.setIsResizing(true);
        }}
        weekProps={weekProps}
        ref={refs.setReference}
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
                onClose={draftUtil.discard}
                onConvert={onConvert}
                onDelete={draftUtil.deleteEvent}
                onSubmit={(_draft: Schema_GridEvent) =>
                  draftUtil.submit(_draft)
                }
                setEvent={draftUtil.setDraft}
              />
            </StyledFloatContainer>
          </FloatingFocusManager>
        )}
      </div>
    </>
  );
};
