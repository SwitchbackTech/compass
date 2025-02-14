import React, { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { useAppSelector } from "@web/store/store.hooks";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { useGridDraft } from "@web/views/Calendar/hooks/draft/grid/useGridDraft";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { getCategory } from "@web/common/utils/event.util";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";

import { GridDraft } from "./GridDraft";

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
  const { draft, isDragging, isResizing } = draftState;

  const isDrafting = useAppSelector(selectIsDrafting);

  const formProps = useEventForm("grid");

  if (isLoadingDOM || !draft || !isDrafting) return null;

  const container = getDraftContainer(draft.isAllDay);
  const category = getCategory(draft);
  const isGridEvent =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  return createPortal(
    <>
      {isGridEvent && (
        <GridDraft
          draft={draft}
          draftUtil={draftUtil}
          formProps={formProps}
          isDragging={isDragging}
          isResizing={isResizing}
          measurements={measurements}
          weekProps={weekProps}
        />
      )}
    </>,
    container
  );
};
