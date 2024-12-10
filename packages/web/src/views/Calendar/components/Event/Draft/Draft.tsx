import React, { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { useAppSelector } from "@web/store/store.hooks";
import { useGridDraft } from "@web/views/Calendar/hooks/draft/useGridDraft";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { getCategory } from "@web/common/utils/event.util";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";
import {
  selectIsDrafting,
  selectIsDraftProcessing,
} from "@web/ducks/events/selectors/draft.selectors";

import { getDraftContainer } from "./draft.util";
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
  const isProcessing = useAppSelector(selectIsDraftProcessing);

  const formProps = useEventForm("grid");
  const [preservedDraft, setPreservedDraft] = useState(draft);

  useEffect(() => {
    if (!isProcessing) {
      setPreservedDraft(draft);
    }
  }, [isProcessing, draft]);

  if (isLoadingDOM) return null;
  if (!preservedDraft) return null;

  if (preservedDraft && !isDrafting && !isProcessing) {
    return null;
  }
  if (!preservedDraft && !draft) return null;

  const container = getDraftContainer(preservedDraft.isAllDay);
  const category = getCategory(preservedDraft);
  const isGridEvent =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  return createPortal(
    <>
      {isGridEvent && (
        <GridDraft
          draft={preservedDraft}
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
