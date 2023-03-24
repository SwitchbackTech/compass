import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";

import { WeekProps } from "../useWeek";
import { useDraftUtil } from "./useDraftUtil";
import { useGridClick } from "./useGridClick";
import { useGridMouseMove } from "./useGridMouseMove";

export const useGridDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
) => {
  const { draftState, draftUtil } = useDraftUtil(
    dateCalcs,
    weekProps,
    isSidebarOpen
  );

  useGridClick(draftState, draftUtil);
  useGridMouseMove(draftState, draftUtil);

  return {
    draftState,
    draftUtil,
  };
};

export type GridDraftProps = ReturnType<typeof useGridDraft>;
