import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";

import { WeekProps } from "../../useWeek";
import { useGridClick } from "./useGridClick";
import { useGridMouseMove } from "./useGridMouseMove";
import { useDraft } from "../useDraft";

export const useGridDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
) => {
  const { draftState, draftUtil } = useDraft(
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
