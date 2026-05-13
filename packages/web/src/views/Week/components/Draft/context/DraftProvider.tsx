import { type ReactNode, useEffect, useMemo } from "react";
import { Categories_Event } from "@core/types/event.types";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftConfirmation } from "../hooks/state/useDraftConfirmation";
import { useDraftForm } from "../hooks/state/useDraftForm";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext, type State_Draft } from "./DraftContext";

interface DraftProviderProps {
  children: ReactNode;
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}
export const DraftProvider = ({
  children,
  dateCalcs,
  weekProps,
}: DraftProviderProps) => {
  const interaction = useMemo(() => new InteractionEngine(), []);
  const { state: originalState, setters } = useDraftState();
  const actions = useDraftActions(
    originalState,
    setters,
    dateCalcs,
    weekProps,
    interaction,
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

  useEffect(() => {
    interaction.mirrorDraftState({
      draft: originalState.draft,
      isDragging: originalState.isDragging,
      isResizing: originalState.isResizing,
    });
  }, [
    interaction,
    originalState.draft,
    originalState.isDragging,
    originalState.isResizing,
  ]);

  return (
    <DraftContext.Provider
      value={{ state, setters, actions, confirmation, interaction }}
    >
      {children}
    </DraftContext.Provider>
  );
};
