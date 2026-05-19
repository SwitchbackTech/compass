import { useCallback, useEffect, useState } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { selectCategorizedEvents } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";

type SidebarSomedayEvents = ReturnType<typeof selectCategorizedEvents>;

export const useSidebarState = () => {
  const categorizedEvents = useAppSelector(selectCategorizedEvents);
  const [somedayEvents, setSomedayEventsState] = useState(categorizedEvents);

  useEffect(() => {
    setSomedayEventsState(categorizedEvents);
  }, [categorizedEvents]);

  const setSomedayEvents = useCallback((nextEvents: SidebarSomedayEvents) => {
    setSomedayEventsState(nextEvents);
  }, []);

  const isDNDing = useAppSelector(selectIsDNDing);

  const [draft, setDraft] = useState<Schema_Event | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);
  const [blockedSomedayDropColumn, setBlockedSomedayDropColumn] = useState<
    string | null
  >(null);
  const [isSomedayFormOpen, setIsSomedayFormOpen] = useState(false);

  const isDragging = isDNDing && draft !== null;

  const somedayWeekIds = somedayEvents.columns[COLUMN_WEEK].eventIds;
  const somedayMonthIds = somedayEvents.columns[COLUMN_MONTH].eventIds;
  const somedayIds = [...somedayWeekIds, ...somedayMonthIds];

  const isDraftingNew =
    isDrafting &&
    !isDraftingExisting &&
    !somedayIds.includes(draft?._id as string);

  const state = {
    draft,
    somedayIds,
    somedayMonthIds,
    somedayWeekIds,
    blockedSomedayDropColumn,
    isDrafting,
    isDraftingNew,
    isDraftingExisting,
    isDragging,
    isSomedayFormOpen,
    somedayEvents,
  };
  const setters = {
    setDraft,
    setBlockedSomedayDropColumn,
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
