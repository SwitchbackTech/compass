import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "../../grid/useGridLayout";
import { WeekProps } from "../../useWeek";
import { useMouseHandlers } from "../../mouse/useMouseHandlers";
import { useDraft } from "./useDraft";
import { useGridClick } from "./useGridClick";

export const useGridDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  measurements: Measurements_Grid,
  isSidebarOpen: boolean
) => {
  const { draftState, draftUtil } = useDraft(
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
