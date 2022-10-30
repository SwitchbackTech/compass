import React, { FC, MouseEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useGridDraft } from "@web/views/Calendar/hooks/draft/useGridDraft";
import { useDraftForm } from "@web/views/Calendar/hooks/draft/useDraftForm";
import { EventForm } from "@web/views/Forms/EventForm";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid.util";
import { getCategory } from "@web/common/utils/event.util";
import { Categories_Event } from "@core/types/event.types";
import { useSelector } from "react-redux";
import { selectDraftId } from "@web/ducks/events/event.selectors";

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

  const { draftState, draftHelpers } = useGridDraft(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );
  const { draft, isDragging } = draftState;

  const { isDrafting } = useSelector(selectDraftId);

  // const isDraftingFr = useMemo(() => {
  //   isDrafting && draftState.draft !== null;
  // }, [draftState.draft, isDrafting]);

  const getContainer = () => {
    if (draft.isAllDay) {
      return getElemById(ID_GRID_EVENTS_ALLDAY);
    }

    return getElemById(ID_GRID_EVENTS_TIMED);
  };

  const onClickOut = () => {
    if (draft.isOpen) {
      console.log("closing Draft cuz clicked out");
      draftHelpers.discard();
    }
  };

  const category = getCategory(draft);

  const {
    attributes,
    formRef,
    popperStyles,
    setPopperElement,
    setReferenceElement,
  } = useDraftForm(category, onClickOut);

  if (isLoadingDOM || !draft) return null;

  const container = getContainer();

  const isGridEvent =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  return createPortal(
    <>
      {isDrafting && isGridEvent && (
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
    container
  );
};

/*
  //   const draftHelpersMemo = useMemo(() => draftHelpers, []);
  //   const isDraggingMemo = useMemo(() => isDragging, []);
  //   const draftIdMemo = useMemo(() => draft?._id || null, []);
  //   const draftMemo = useMemo(() => draft, []);
  // const { component } = weekProps;
*/
