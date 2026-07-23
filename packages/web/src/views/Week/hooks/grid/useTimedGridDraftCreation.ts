import { type GridEventDraft } from "@web/events/event-draft.types";
import { draftActions } from "@web/events/stores/draft.store";
import { useTimedDraftCreation } from "@web/grid/hooks/useTimedDraftCreation";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "../useWeek";
import { type DateCalcs } from "./useDateCalcs";

export const useTimedGridDraftCreation = ({
  dateCalcs,
  weekProps,
}: {
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}) => {
  const { actions } = useDraftContext();

  return useTimedDraftCreation({
    getStartDate: ({ x, y }) =>
      dateCalcs.getDateByXY(x, y, weekProps.component.startOfView),
    onFinish: (draft: GridEventDraft) => {
      actions.stopResizing();
      actions.stopDragging();
      draftActions.startGridDraft({ activity: "gridClick", draft });
    },
  });
};
