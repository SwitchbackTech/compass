import { useDraftState } from "./state/useDraftState";
import { useDraftActions } from "./actions/useDraftActions";
import { useDraftForm } from "./form/useDraftForm";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

export const useDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean,
) => {
  const { state, setters } = useDraftState();
  const {
    isDragging,
    isResizing,
    draft,
    dragStatus,
    resizeStatus,
    isFormOpen,
  } = state;

  const {
    setIsDragging,
    setIsResizing,
    setDraft,
    setDragStatus,
    setResizeStatus,
    setDateBeingChanged,
    setIsFormOpen,
  } = setters;

  const actions = useDraftActions(
    state,
    {
      setIsDragging,
      setIsResizing,
      setDraft,
      setDragStatus,
      setResizeStatus,
      setDateBeingChanged,
      setIsFormOpen,
    },
    dateCalcs,
    weekProps,
    isSidebarOpen,
  );

  const { formProps } = useDraftForm(
    isFormOpen,
    actions.reset,
    actions.discard,
    setIsFormOpen,
  );

  return {
    draftState: {
      draft,
      dragStatus,
      formProps,
      isDragging,
      isFormOpen,
      isResizing,
      resizeStatus,
    },
    draftUtil: {
      ...actions,
      setDateBeingChanged,
      setDraft,
      setIsDragging,
      setIsFormOpen,
      setIsResizing,
    },
  };
};

type Hook_Draft = ReturnType<typeof useDraft>;
export type State_Draft = Hook_Draft["draftState"];
export type Util_Draft = Hook_Draft["draftUtil"];
