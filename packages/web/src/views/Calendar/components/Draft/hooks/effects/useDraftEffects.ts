import dayjs from "dayjs";
import { useEffect } from "react";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Setters_Draft, State_Draft_Local } from "../state/useDraftState";

export const useDraftEffects = (
  state: State_Draft_Local,
  setters: Setters_Draft,
  weekProps: WeekProps,
  isDrafting: boolean,
  handleChange: () => Promise<void>,
) => {
  const { draft, isDragging, isResizing, dateBeingChanged } = state;
  const {
    setDraft,
    setIsDragging,
    setIsFormOpen,
    setIsResizing,
    setResizeStatus,
    setDragStatus,
    setDateBeingChanged,
  } = setters;

  useEffect(() => {
    if (isDragging || isResizing) {
      return;
    }

    // Only skip clearing if we're currently dragging AND the week change was due to drag-to-edge navigation
    const lastNavigationSource = weekProps.util.getLastNavigationSource();
    const isDragToEdgeNavigation = lastNavigationSource === "drag-to-edge";
    const shouldPreserveDuringDrag =
      (isDragging || isResizing) && isDragToEdgeNavigation;

    if (shouldPreserveDuringDrag) {
      return;
    }

    setDraft(null);
    setIsDragging(false);
    setIsFormOpen(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekProps.component.week, isDragging, weekProps.util]);

  useEffect(() => {
    if (isResizing) {
      setDateBeingChanged(dateBeingChanged);
      setIsFormOpen(false);
    }
  }, [dateBeingChanged, isResizing]);

  useEffect(() => {
    const isStaleDraft = !isDrafting;
    if (isStaleDraft) {
      setDraft(null);
      setIsDragging(false);
      setIsFormOpen(false);
      setIsResizing(false);
      setDragStatus(null);
      setResizeStatus(null);
      setDateBeingChanged(null);
    }
  }, [
    isDrafting,
    setDateBeingChanged,
    setDraft,
    setDragStatus,
    setIsDragging,
    setIsFormOpen,
    setIsResizing,
    setResizeStatus,
  ]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  useEffect(() => {
    if (isDragging && draft) {
      setIsFormOpen(false);
      const durationMin = dayjs(draft.endDate).diff(draft.startDate, "minutes");

      setDragStatus({
        durationMin,
      });
    }
  }, [isDragging]);
};
