import React from "react";
import { Categories_Event } from "@web/common/types/web.event.types";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftConfirmation } from "../hooks/state/useDraftConfirmation";
import { useDraftForm } from "../hooks/state/useDraftForm";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext, State_Draft } from "./DraftContext";

interface DraftProviderProps {
  children: React.ReactNode;
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
  isSidebarOpen: boolean;
}
export const DraftProvider = ({
  children,
  dateCalcs,
  weekProps,
  isSidebarOpen,
}: DraftProviderProps) => {
  const { state: originalState, setters } = useDraftState();
  const actions = useDraftActions(
    originalState,
    setters,
    dateCalcs,
    weekProps,
    isSidebarOpen,
  );
  const { discard, reset } = actions;
  const { isFormOpen } = originalState;
  const { setIsFormOpen } = setters;

  const _category = useAppSelector(selectDraftCategory);
  const category = _category || Categories_Event.TIMED;

  const formProps = useDraftForm(
    category,
    isFormOpen,
    discard,
    reset,
    setIsFormOpen,
  );

  const state: State_Draft = {
    ...originalState,
    formProps,
  };

  const confirmation = useDraftConfirmation({ actions, state });

  return (
    <DraftContext.Provider value={{ state, setters, actions, confirmation }}>
      {children}
    </DraftContext.Provider>
  );
};
