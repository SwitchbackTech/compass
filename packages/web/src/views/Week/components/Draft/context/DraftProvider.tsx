import type React from "react";
import { useMemo } from "react";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext } from "./DraftContext";

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
  const { state, setters } = useDraftState();
  const actions = useDraftActions(state, setters, dateCalcs, weekProps);
  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
};
