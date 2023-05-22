import { useState, useEffect } from "react";
import { Categories_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useAppSelector } from "@web/store/store.hooks";
import { COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  selectDraftId,
  selectDraftStatus,
} from "@web/ducks/events/selectors/draft.selectors";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
  selectSomedayEvents,
} from "@web/ducks/events/selectors/someday.selectors";

import { useMousePosition } from "../useMousePosition";

export const useSidebarState = (measurements: Measurements_Grid) => {
  const _somedayEvents = useAppSelector(selectSomedayEvents);
  const [somedayEvents, setSomedayEvents] = useState(_somedayEvents);
  useEffect(() => {
    setSomedayEvents(_somedayEvents);
  }, [_somedayEvents]);

  const { eventType: draftType } = useAppSelector(selectDraftStatus);
  const { isDrafting: isDraftingRedux } = useAppSelector(selectDraftId);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);

  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);

  const isDragging = isDrafting && draft !== null;
  const { isOverAllDayRow, isOverGrid, isOverMainGrid, mouseCoords } =
    useMousePosition(isDragging, draft?.isOpen, measurements);

  const existingIds = somedayEvents.columns[COLUMN_WEEK].eventIds;

  const _isDrafting = isDrafting && isDraftingRedux && draft !== null;

  const isDraftingMonthlySomeday =
    _isDrafting && draftType === Categories_Event.SOMEDAY_MONTH;

  // const isDraftingNew =
  // isDrafting && !isDraftingExisting && !existingIds.includes(draft?._id);
  const _isDraftingNew = isDrafting && !isDraftingExisting;
  const isDraftingNewWeekly =
    _isDraftingNew &&
    draftType === Categories_Event.SOMEDAY_WEEK &&
    !existingIds.includes(draft?._id);

  const _isDraftingRedux = isDraftingExisting || _isDraftingNew;
  const shouldPreviewOnGrid =
    draft !== null && _isDraftingRedux && isOverGrid && !draft?.isOpen;

  return {
    draft,
    draftType,
    existingIds,
    isAtMonthlyLimit,
    isAtWeeklyLimit,
    isDraftingExisting,
    isDraftingMonthlySomeday,
    isDraftingNewWeekly,
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
