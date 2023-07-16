import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { DateCalcs } from "../../grid/useDateCalcs";
import { useSidebarEffects } from "./useSidebarEffects";
import { useSidebarUtil } from "./useSidebarUtil";
import { useSidebarState } from "./useSidebarState";

export const useSidebar = (
  measurements: Measurements_Grid,
  dateCalcs: DateCalcs
) => {
  const state = useSidebarState(measurements);
  const util = useSidebarUtil(dateCalcs, state);
  useSidebarEffects(state, util);

  const _state = {
    draft: state.draft,
    draftType: state.draftType,
    existingIds: state.somedayWeekIds,
    isDraftingExisting: state.isDraftingExisting,
    isDraftingNew: state.isDraftingNew,
    isOverAllDayRow: state.isOverAllDayRow,
    isOverGrid: state.isOverGrid,
    isOverMainGrid: state.isOverMainGrid,
    mouseCoords: state.mouseCoords,
    somedayEvents: state.somedayEvents,
    shouldPreviewOnGrid: state.shouldPreviewOnGrid,
  };

  return {
    state: _state,
    util: {
      ...util,
      setDraft: state.setDraft,
      setIsDrafting: state.setIsDrafting,
    },
  };
};

export type SomedayEventsProps = ReturnType<typeof useSidebar>;
