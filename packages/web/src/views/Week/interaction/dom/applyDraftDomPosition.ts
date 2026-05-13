import { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventPosition } from "@web/common/utils/position/position.util";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";

interface ApplyDraftDomPositionParams {
  baseDraft: Schema_GridEvent;
  draft: Schema_GridEvent;
  element: HTMLElement;
  endOfView: Dayjs;
  measurements: Measurements_Grid;
  startOfView: Dayjs;
}

export const applyDraftDomPosition = ({
  baseDraft,
  draft,
  element,
  endOfView,
  measurements,
  startOfView,
}: ApplyDraftDomPositionParams) => {
  const basePosition = getEventPosition(
    baseDraft,
    startOfView,
    endOfView,
    measurements,
    true,
  );
  const nextPosition = getEventPosition(
    draft,
    startOfView,
    endOfView,
    measurements,
    true,
  );
  const deltaX = nextPosition.left - basePosition.left;
  const deltaY = nextPosition.top - basePosition.top;

  element.style.transform =
    deltaX === 0 && deltaY === 0
      ? ""
      : `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  element.style.height = `${nextPosition.height}px`;
  element.style.width = `${nextPosition.width}px`;
};

export const resetDraftDomPosition = (element: HTMLElement) => {
  element.style.transform = "";
  element.style.height = "";
  element.style.width = "";
};
