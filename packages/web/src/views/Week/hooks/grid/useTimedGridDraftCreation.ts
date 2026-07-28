import { type GridEventDraft } from "@web/events/event-draft.types";
import { draftActions } from "@web/events/stores/draft.store";
import { useTimedDraftCreation } from "@web/grid/hooks/useTimedDraftCreation";
import { type WeekProps } from "../useWeek";
import { type DateCalcs } from "./useDateCalcs";

export const useTimedGridDraftCreation = ({
  dateCalcs,
  weekProps,
}: {
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}) =>
  useTimedDraftCreation({
    getStartDate: ({ x, y }) =>
      dateCalcs.getDateByXY(x, y, weekProps.component.startOfView),
    onFinish: (draft: GridEventDraft) => {
      draftActions.startGridDraft({ activity: "gridClick", draft });
    },
  });
