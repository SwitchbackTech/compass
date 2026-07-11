import { useCallback, useEffect, useState } from "react";
import { type Event } from "@core/types/event.contracts";
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
  const isDNDing = useDraftStore(selectIsDNDing);
  const [somedayEvents, setSomedayEventsState] = useState(categorizedEvents);

  // Only resync from the query's derived view while no sidebar drag is in
  // flight. A live reorder preview (and a just-submitted create) sets this
  // state directly with its own already-correct value; letting a query
  // refetch overwrite it mid-drag would blow away the preview out from
  // under the pointer.
  useEffect(() => {
    if (isDNDing) return;
    setSomedayEventsState(categorizedEvents);
  }, [categorizedEvents, isDNDing]);

  const setSomedayEvents = useCallback((nextEvents: SidebarSomedayEvents) => {
    setSomedayEventsState(nextEvents);
  }, []);

  const [draft, setDraft] = useState<Event | null>(null);
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
    !somedayIds.includes(draft?.id as string);

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
