import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";

import { WeekProps } from "../useWeek";
import { useDraftUtil } from "./useDraftUtil";
import { useGridClick } from "./useGridClick";
import { useMouseHandlers } from "./useMouseHandlers";
import { Measurements_Grid } from "../grid/useGridLayout";

export const useGridDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  measurements: Measurements_Grid,
  isSidebarOpen: boolean
) => {
  const { draftState, draftUtil } = useDraftUtil(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );

  useGridClick(draftState, draftUtil);
  useMouseHandlers(
    draftState,
    draftUtil,
    dateCalcs,
    measurements,
    weekProps.component.startOfView
  );

  return {
    draftState,
    draftUtil,
  };
};

export type GridDraftProps = ReturnType<typeof useGridDraft>;
