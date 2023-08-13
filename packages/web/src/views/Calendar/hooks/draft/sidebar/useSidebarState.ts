import { useState, useEffect } from "react";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useAppSelector } from "@web/store/store.hooks";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  selectDraftId,
  selectDraftStatus,
} from "@web/ducks/events/selectors/draft.selectors";
import { selectCategorizedEvents } from "@web/ducks/events/selectors/someday.selectors";

import { useMousePosition } from "../useMousePosition";

export const useSidebarState = (measurements: Measurements_Grid) => {
  const categorizedEvents = useAppSelector(selectCategorizedEvents);
  const [somedayEvents, setSomedayEvents] = useState(categorizedEvents);

  useEffect(() => {
    setSomedayEvents(categorizedEvents);
  }, [categorizedEvents]);

  const { eventType: draftType } = useAppSelector(selectDraftStatus);
  const { isDrafting: isDraftingRedux } = useAppSelector(selectDraftId);

  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);

  const isDragging = isDrafting && draft !== null;
  const { isOverAllDayRow, isOverGrid, isOverMainGrid, mouseCoords } =
    useMousePosition(isDragging, draft?.isOpen, measurements);

  const somedayWeekIds = somedayEvents.columns[COLUMN_WEEK]
    .eventIds as string[];
  const somedayMonthIds = somedayEvents.columns[COLUMN_MONTH]
    .eventIds as string[];
  const somedayIds = [...somedayWeekIds, ...somedayMonthIds];

  const isDraftingNew =
    isDrafting && !isDraftingExisting && !somedayIds.includes(draft?._id);
  const _isDraftingRedux = isDraftingExisting || isDraftingNew;
  const shouldPreviewOnGrid =
    draft !== null && _isDraftingRedux && isOverGrid && !draft?.isOpen;

  return {
    draft,
    draftType,
    somedayIds,
    somedayMonthIds,
    somedayWeekIds,
    isDraftingNew,
    isDraftingExisting,
    isDraftingRedux,
    isOverAllDayRow,
    isOverGrid,
    isOverMainGrid,
    mouseCoords,
    shouldPreviewOnGrid,
    somedayEvents,
    setDraft,
    setIsDrafting,
    setIsDraftingExisting,
    setSomedayEvents,
  };
};

export type State_Sidebar = ReturnType<typeof useSidebarState>;
