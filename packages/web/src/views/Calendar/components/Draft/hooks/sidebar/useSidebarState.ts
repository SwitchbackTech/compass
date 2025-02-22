import { useEffect, useState } from "react";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { selectDraftStatus } from "@web/ducks/events/selectors/draft.selectors";
import { selectCategorizedEvents } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useMousePosition } from "./useMousePosition";

export const useSidebarState = (measurements: Measurements_Grid) => {
  const categorizedEvents = useAppSelector(selectCategorizedEvents);
  const [somedayEvents, setSomedayEvents] = useState(categorizedEvents);

  useEffect(() => {
    setSomedayEvents(categorizedEvents);
  }, [categorizedEvents]);

  const { eventType: draftType } = useAppSelector(selectDraftStatus);

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

  const shouldPreviewOnGrid = draft !== null && isOverGrid && !draft?.isOpen;

  return {
    draft,
    draftType,
    somedayIds,
    somedayMonthIds,
    somedayWeekIds,
    isDrafting,
    isDraftingNew,
    isDraftingExisting,
    isDragging,
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
