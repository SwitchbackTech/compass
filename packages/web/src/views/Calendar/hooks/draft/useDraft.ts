import { DateCalcs } from "../grid/useDateCalcs";
import { WeekProps } from "../useWeek";
import { useDraftState } from "./state/useDraftState";
import { useDraftActions } from "./actions/useDraftActions";

export const useDraft = (
  dateCalcs: DateCalcs,
  weekProps: WeekProps,
  isSidebarOpen: boolean
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
    isSidebarOpen
  );

  return {
    draftState: {
      draft,
      dragStatus,
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
