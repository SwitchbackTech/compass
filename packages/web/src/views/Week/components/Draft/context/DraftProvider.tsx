import type React from "react";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftConfirmation } from "../hooks/state/useDraftConfirmation";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext, type State_Draft } from "./DraftContext";

interface DraftProviderProps {
  children: React.ReactNode;
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}
export const DraftProvider = ({
  children,
  dateCalcs,
  weekProps,
}: DraftProviderProps) => {
  const { state: originalState, setters } = useDraftState();
  const actions = useDraftActions(originalState, setters, dateCalcs, weekProps);

  const state: State_Draft = {
    ...originalState,
    form: actions.form,
  };

  const confirmation = useDraftConfirmation({ actions, state });

  return (
    <DraftContext.Provider value={{ state, setters, actions, confirmation }}>
      {children}
    </DraftContext.Provider>
  );
};
