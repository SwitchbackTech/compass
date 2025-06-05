import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { GridEventPreview } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/GridEventPreview";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import {
  GRID_X_START,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { useSidebarContext } from "../../../Draft/sidebar/context/useSidebarContext";
import { EventPlaceholder, SidebarList } from "../../styled";
import { SomedayEventsContainer } from "./SomedayEventsContainer/SomedayEventsContainer";

interface Props {
  category: Categories_Event;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  mainGridRef: Refs_Grid["mainGridRef"];
}
export const SomedayEvents: FC<Props> = ({
  category,
  dateCalcs,
  measurements,
  viewStart,
  mainGridRef,
}) => {
  const { actions, state } = useSidebarContext();
  const gridX = state.mouseCoords.x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = dateCalcs.getDayNumberByX(gridX);

  const column =
    state.somedayEvents.columns[
      category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH
    ];

  const draftCategory = useAppSelector(selectDraftCategory);
  const isDraftingNew = state.isDraftingNew && draftCategory === category;

  return (
    <>
      {state.shouldPreviewOnGrid && state.draft && (
        <GridEventPreview
          dateCalcs={dateCalcs}
          dayIndex={dayIndex}
          event={state.draft}
          isOverAllDayRow={state.isOverAllDayRow}
          isOverMainGrid={state.isOverGrid}
          measurements={measurements}
          mouseCoords={state.mouseCoords}
          startOfView={viewStart}
          mainGridRef={mainGridRef}
        />
      )}

      <SidebarList>
        <div key={`${category}-wrapper`}>
          <SomedayEventsContainer
            category={category}
            column={column}
            key={COLUMN_WEEK}
          />
        </div>
        {!isDraftingNew && (
          <TooltipWrapper
            description={
              category === Categories_Event.SOMEDAY_MONTH
                ? "Add to month"
                : "Add to week"
            }
            onClick={() => actions.onPlaceholderClick(category)}
            shortcut={category === Categories_Event.SOMEDAY_MONTH ? "M" : "W"}
          >
            <EventPlaceholder>
              <Text size="l">+</Text>
            </EventPlaceholder>
          </TooltipWrapper>
        )}
      </SidebarList>
    </>
  );
};
