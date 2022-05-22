import React, { FC, MouseEvent, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { useDraft } from "@web/views/Calendar/hooks/draft/useDraft";
import { EventForm } from "@web/views/Forms/EventForm";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
  ZIndex,
} from "@web/common/constants/web.constants";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useEventPosition } from "@web/views/Calendar/hooks/event/useEventPosition";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";

import { GridEvent } from "../Grid/GridEvent";

interface Props {
  dateCalcs: DateCalcs;
  isSidebarOpen: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const ShortcutDraft: FC<Props> = ({
  dateCalcs,
  isSidebarOpen,
  measurements,
  weekProps,
}) => {
  const [isLoadingDOM, setIsLoadingDOM] = useState(true);

  useEffect(() => {
    setIsLoadingDOM(false);
  }, []);

  const { component } = weekProps;
  const { draftState, draftHelpers } = useDraft(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );
  const { draft } = draftState;

  const position = useEventPosition(
    draft,
    component.startOfSelectedWeekDay,
    component.endOfSelectedWeekDay,
    measurements
  );

  const formRef = useRef<HTMLDivElement>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "auto",
    modifiers: [
      // {
      //   name: "preventOverflow",
      //   options: {
      //     altAxis: true,
      //     mainAxis: true,
      //   },
      // },
      {
        name: "flip",
        options: {
          fallbackPlacements: ["right", "left", "top", "bottom"],
        },
      },
      {
        name: "offset",
        options: {
          offset: [0, 10],
        },
      },
    ],
  });
  const popperStyles = {
    ...styles.popper,
    zIndex: ZIndex.LAYER_2,
  };

  useOnClickOutside(formRef, (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    draftHelpers.discard();
  });

  if (isLoadingDOM) return null;

  const gridContainer = draft?.isAllDay
    ? document.querySelector(`#${ID_GRID_ALLDAY_ROW}`)
    : document.querySelector(`#${ID_GRID_MAIN}`);

  return createPortal(
    <>
      {draftState.isReady && (
        <>
          <GridEvent
            draft={draft}
            isDragging={draftState.isDragging}
            isResizing={!draft.isOpen}
            onEventMouseDown={draftHelpers.startDragging}
            onMouseMove={draftHelpers.resize}
            onMouseUp={draftHelpers.stopResizing}
            onResize={draftHelpers.resize}
            onScalerMouseDown={(
              e: MouseEvent,
              field: "startDate" | "endDate"
            ) => draftHelpers.startResizing(e, field)}
            position={position}
            ref={setReferenceElement}
          />

          <div
            ref={setPopperElement}
            style={popperStyles}
            {...attributes.popper}
          >
            {draft.isOpen && (
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
