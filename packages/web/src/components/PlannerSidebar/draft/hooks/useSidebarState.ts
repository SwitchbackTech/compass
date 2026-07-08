import { useCallback, useEffect, useState } from "react";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
import { selectIsDNDing, useDraftStore } from "@web/events/stores/draft.store";
import { selectDatesInView, useViewStore } from "@web/events/stores/view.store";

type SidebarSomedayEvents = ReturnType<
  typeof useSomedayEventViewModel
>["categorized"];

export const useSidebarState = () => {
  const dates = useViewStore(selectDatesInView);
  const { categorized: categorizedEvents } = useSomedayEventViewModel(
    dayjs(dates.start),
    dayjs(dates.end),
  );
  const [somedayEvents, setSomedayEventsState] = useState(categorizedEvents);

  useEffect(() => {
    setSomedayEventsState(categorizedEvents);
  }, [categorizedEvents]);

  const setSomedayEvents = useCallback((nextEvents: SidebarSomedayEvents) => {
    setSomedayEventsState(nextEvents);
  }, []);

  const isDNDing = useDraftStore(selectIsDNDing);

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
