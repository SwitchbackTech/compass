import React, { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { useAppSelector } from "@web/store/store.hooks";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getCategory } from "@web/common/utils/event.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";

import { GridDraft } from "./GridDraft";
import { useGridClick } from "./hooks/grid/useGridClick";
import { useGridMouseMove } from "./hooks/grid/useGridMouseMove";
import { useDraftContext } from "./context/useDraftContext";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Draft: FC<Props> = ({ measurements, weekProps }) => {
  const [isLoadingDOM, setIsLoadingDOM] = useState(true);

  useEffect(() => {
    setIsLoadingDOM(false);
  }, []);

  useGridClick();
  useGridMouseMove();

  const { state } = useDraftContext();
  const { draft, isDragging, isResizing } = state;
  const isDrafting = useAppSelector(selectIsDrafting);

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
          isDragging={isDragging}
          isResizing={isResizing}
          measurements={measurements}
          weekProps={weekProps}
        />
      )}
    </>,
    container,
  );
};
