import React, { ReactNode } from "react";
import { Categories_Event } from "@core/types/event.types";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useDraftForm } from "../../hooks/state/useDraftForm";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarState } from "../hooks/useSidebarState";
import { SidebarDraftContext } from "./SidebarDraftContext";

interface Props {
  children: ReactNode;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
}
export const SidebarDraftProvider = ({
  children,
  dateCalcs,
  measurements,
}: Props) => {
  const { setters, state: _state } = useSidebarState(measurements);
  const actions = useSidebarActions(dateCalcs, _state, setters);

  const _category = useAppSelector(selectDraftCategory);
  const category = _category || Categories_Event.TIMED;
  const formProps = useDraftForm(
    category,
    _state.isSomedayFormOpen,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const state = {
    ..._state,
    formProps,
  };

  return (
    <SidebarDraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </SidebarDraftContext.Provider>
  );
};
