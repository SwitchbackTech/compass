import { type GridEventDraft } from "@web/events/event-draft.types";
import { type GridCoordinates } from "@web/grid/hooks/useGridCoordinates";
import { useTimedDraftCreation } from "@web/grid/hooks/useTimedDraftCreation";

export const useDayTimedDraftCreation = ({
  dateCalcs,
  onOpenDraft,
}: {
  dateCalcs: GridCoordinates;
  onOpenDraft: (draft: GridEventDraft) => void;
}) =>
  useTimedDraftCreation({
    finishWhenPrimaryButtonReleased: false,
    getStartDate: ({ x, y }) => dateCalcs.getDateByXY(x, y),
    onFinish: onOpenDraft,
  });
