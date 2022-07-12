import React, { FC, MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDraft } from "@web/views/Calendar/hooks/draft/useDraft";
import { EventForm } from "@web/views/Forms/EventForm";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useDraftForm } from "@web/views/Calendar/hooks/draft/useDraftForm";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid.util";

import { GridEvent } from "../Grid";

interface Props {
  dateCalcs: DateCalcs;
  isSidebarOpen: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Draft: FC<Props> = ({
  dateCalcs,
  isSidebarOpen,
  measurements,
  weekProps,
}) => {
  const [isLoadingDOM, setIsLoadingDOM] = useState(true);

  useEffect(() => {
    setIsLoadingDOM(false);
  }, []);

  const { draftState, draftHelpers } = useDraft(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );

  const isDrafting = draftState.draft !== null;
  const { draft, isDragging } = draftState;

  const onClickOut = () => {
    if (draft.isOpen) {
      draftHelpers.discard();
    }
  };

  const {
    attributes,
    formRef,
    popperStyles,
    setPopperElement,
    setReferenceElement,
  } = useDraftForm(onClickOut);

  const gridContainer = draft?.isAllDay
    ? getElemById(ID_GRID_EVENTS_ALLDAY)
    : getElemById(ID_GRID_EVENTS_TIMED);

  if (isLoadingDOM) return null;

  return createPortal(
    <>
      {isDrafting && (
        <>
          <GridEvent
            event={draft}
            isDragging={isDragging}
            isDraft={true}
            isPlaceholder={false}
            isResizing={false}
            key={`draft-${draft?._id}`}
            measurements={measurements}
            onEventMouseDown={(event: Schema_GridEvent, e: MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
              draftHelpers.setIsDragging(true);
            }}
            onScalerMouseDown={(
              event: Schema_GridEvent,
              e: MouseEvent,
              dateToChange: "startDate" | "endDate"
            ) => {
              e.stopPropagation();
              e.preventDefault();
              draftHelpers.setDateBeingChanged(dateToChange);
              draftHelpers.setIsResizing(true);
            }}
            ref={setReferenceElement}
            weekProps={weekProps}
          />

          <div
            ref={setPopperElement}
            style={popperStyles}
            {...attributes.popper}
          >
            {draft?.isOpen && (
              <div ref={formRef}>
                <EventForm
                  event={draft}
                  onClose={draftHelpers.discard}
                  onDelete={draftHelpers.deleteEvent}
                  onSubmit={draftHelpers.submit}
                  setEvent={draftHelpers.setDraft}
                />
              </div>
            )}
          </div>
        </>
      )}
    </>,
    gridContainer
  );
};

/*
  //   const draftHelpersMemo = useMemo(() => draftHelpers, []);
  //   const isDraggingMemo = useMemo(() => isDragging, []);
  //   const draftIdMemo = useMemo(() => draft?._id || null, []);
  //   const draftMemo = useMemo(() => draft, []);
  // const { component } = weekProps;

  // const position = useEventPosition(
  //   draft,
  //   component.startOfSelectedWeekDay,
  //   component.endOfSelectedWeekDay,
  //   measurements
  // );
*/
