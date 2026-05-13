import { type FC } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useInteractionSnapshot } from "@web/views/Week/interaction/interaction.store";
import { useDraftContext } from "./context/useDraftContext";
import { GridDraft } from "./grid/GridDraft";
import { useGridMouseMove } from "./grid/hooks/useGridMouseMove";
import { useGridMouseUp } from "./grid/hooks/useGridMouseUp";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Draft: FC<Props> = ({ measurements, weekProps }) => {
  useGridMouseUp();
  useGridMouseMove();

  const category = useAppSelector(selectDraftCategory);
  const { interaction } = useDraftContext();
  const interactionState = useInteractionSnapshot(interaction.getStore());
  const { draft } = interactionState;
  const isDragging = interactionState.mode === "drag";
  const isResizing = interactionState.mode === "resize";

  if (draft?.isAllDay === undefined) {
    return null;
  }
  if (!category) return null;

  const container = getDraftContainer(category);
  if (!container) return null;

  const isGridDraft =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  return createPortal(
    isGridDraft && (
      <GridDraft
        draft={draft}
        isDragging={isDragging}
        isResizing={isResizing}
        measurements={measurements}
        weekProps={weekProps}
      />
    ),
    container,
  );
};
