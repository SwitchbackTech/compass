import { useEffect, useState } from "react";
import { Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
import { useMouseState } from "@web/common/hooks/useMouseState";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { selectCategorizedEvents } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";

export const useSidebarState = () => {
  const categorizedEvents = useAppSelector(selectCategorizedEvents);
  const [somedayEvents, setSomedayEvents] = useState(categorizedEvents);

  useEffect(() => {
    setSomedayEvents(categorizedEvents);
  }, [categorizedEvents]);

  const isDNDing = useAppSelector(selectIsDNDing);

  const [draft, setDraft] = useState<Schema_Event | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);
  const [isSomedayFormOpen, setIsSomedayFormOpen] = useState(false);

  const isDragging = isDrafting && draft !== null; // TODO: Probably not a good way to determine if we are dragging, consider refactoring or removing this comment.
  const { toggleMouseMovementTracking } = useMousePosition();
  const { isOverAllDayRow, isOverGrid, isOverMainGrid } = useMouseState();

  const somedayWeekIds = somedayEvents.columns[COLUMN_WEEK]
    .eventIds as string[];
  const somedayMonthIds = somedayEvents.columns[COLUMN_MONTH]
    .eventIds as string[];
  const somedayIds = [...somedayWeekIds, ...somedayMonthIds];

  const isDraftingNew =
    isDrafting &&
    !isDraftingExisting &&
    !somedayIds.includes(draft?._id as string);

  const shouldPreviewOnGrid = isDNDing && isOverGrid;

  useEffect(() => {
    toggleMouseMovementTracking(!isDNDing);

    return () => toggleMouseMovementTracking(false);
  }, [isDNDing, toggleMouseMovementTracking]);

  const state = {
    draft,
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
    isSomedayFormOpen,
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
