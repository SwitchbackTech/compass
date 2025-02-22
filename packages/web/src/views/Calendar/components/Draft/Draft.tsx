import React, { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import {
  selectDraftCategory,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDraftContext } from "./context/useDraftContext";
import { GridDraft } from "./grid/GridDraft";
import { useGridClick } from "./grid/hooks/useGridClick";
import { useGridMouseMove } from "./grid/hooks/useGridMouseMove";
import { SomedayDraft } from "./sidebar/SomedayDraft";

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

  const isDrafting = useAppSelector(selectIsDrafting);
  const category = useAppSelector(selectDraftCategory);
  const { state } = useDraftContext();
  const { draft, isDragging, isResizing } = state;

  if (isLoadingDOM || !draft || !isDrafting) return null;

  if (draft?.isAllDay === undefined) {
    console.error("draft.isAllDay is undefined", draft);
    return null;
  }

  if (!category) return null;

  const container = getDraftContainer(category);
  const isGridEvent =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  const isSomedayEvent =
    category === Categories_Event.SOMEDAY_WEEK ||
    category === Categories_Event.SOMEDAY_MONTH;

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
      {isSomedayEvent && (
        <SomedayDraft
          category={category}
          draft={draft}
          index={0}
          isOverGrid={false}
        />
      )}
    </>,
    container,
  );
};
