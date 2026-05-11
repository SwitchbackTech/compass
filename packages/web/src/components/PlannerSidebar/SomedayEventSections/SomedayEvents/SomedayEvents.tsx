import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { SomedayEventsContainer } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/SomedayEventsContainer";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { GridEventPreview } from "@web/views/Week/components/Event/Grid/GridEventPreview/GridEventPreview";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  category: Categories_Event;
  dateCalcs?: DateCalcs;
  measurements?: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  mainGridRef?: Refs_Grid["mainGridRef"];
}
export const SomedayEvents: FC<Props> = ({
  category,
  dateCalcs,
  measurements,
  viewStart,
  mainGridRef,
}) => {
  const { state } = useSidebarContext();
  const draftCategory = useAppSelector(selectDraftCategory);

  const column =
    state.somedayEvents.columns[
      category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH
    ];

  const isDraftingNew = state.isDraftingNew && draftCategory === category;

  return (
    <>
      {state.shouldPreviewOnGrid &&
        state.draft &&
        dateCalcs &&
        measurements &&
        mainGridRef && (
          <GridEventPreview
            dateCalcs={dateCalcs}
            event={state.draft}
            isOverAllDayRow={state.isOverAllDayRow}
            isOverMainGrid={state.isOverGrid}
            measurements={measurements}
            startOfView={viewStart}
            mainGridRef={mainGridRef}
          />
        )}

      <div className="w-full overflow-auto">
        <div key={`${category}-wrapper`}>
          <SomedayEventsContainer
            category={category}
            column={column}
            key={COLUMN_WEEK}
            isDraftingNew={isDraftingNew}
          />
        </div>
      </div>
    </>
  );
};
