import { useEffect, useState } from "react";
import { Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  selectDraftStatus,
  selectIsDNDing,
} from "@web/ducks/events/selectors/draft.selectors";
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
  const isDNDing = useAppSelector(selectIsDNDing);

  const [draft, setDraft] = useState<Schema_Event | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);
  const [isSomedayFormOpen, setIsSomedayFormOpen] = useState(false);

  const isDragging = isDrafting && draft !== null;
  const { isOverAllDayRow, isOverGrid, isOverMainGrid, mouseCoords } =
    useMousePosition(isDNDing, isSomedayFormOpen, measurements);

  const somedayWeekIds = somedayEvents.columns[COLUMN_WEEK]
    .eventIds as string[];
  const somedayMonthIds = somedayEvents.columns[COLUMN_MONTH]
    .eventIds as string[];
  const somedayIds = [...somedayWeekIds, ...somedayMonthIds];

  const isDraftingNew =
    isDrafting && !isDraftingExisting && !somedayIds.includes(draft?._id);

  const shouldPreviewOnGrid = isDNDing && isOverGrid;

  const state = {
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
  };
  const setters = {
    setDraft,
    setIsDrafting,
    setIsDraftingExisting,
    setIsSomedayFormOpen,
    setSomedayEvents,
  };

  return {
    state,
    setters,
  };
};

type Hook_Sidebar = ReturnType<typeof useSidebarState>;
export type State_Sidebar = Hook_Sidebar["state"];
export type Setters_Sidebar = Hook_Sidebar["setters"];
