import React, { FC, MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { useAppSelector } from "@web/store/store.hooks";
import { useGridDraft } from "@web/views/Calendar/hooks/draft/useGridDraft";
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
import { selectDraftId } from "@web/ducks/events/event.selectors";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

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

  const { draftState, draftUtil } = useGridDraft(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );
  const { draft, isDragging } = draftState;

  const { isDrafting } = useAppSelector(selectDraftId);

  const getContainer = () => {
    if (!draft) return null;

    if (draft.isAllDay) {
      return getElemById(ID_GRID_EVENTS_ALLDAY);
    }

    return getElemById(ID_GRID_EVENTS_TIMED);
  };

  const { x, y, reference, floating, strategy } = useEventForm("grid");

  if (isLoadingDOM || !draft) return null;

  const container = getContainer();
  const category = getCategory(draft);
  const isGridEvent =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    draftUtil.convert(start, end);
  };

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
            ref={reference}
            weekProps={weekProps}
          />

          <div>
            {draft?.isOpen && (
              <StyledFloatContainer
                ref={floating}
                strategy={strategy}
                top={y ?? 0}
                left={x ?? 0}
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
            )}
          </div>
        </>
      )}
    </>,
    container
  );
};
