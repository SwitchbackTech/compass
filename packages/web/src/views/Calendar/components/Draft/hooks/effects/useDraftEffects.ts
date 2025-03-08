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
    setDraft(null);
    setIsDragging(false);
    setIsFormOpen(false);
    setIsResizing(false);
    setDragStatus(null);
    setResizeStatus(null);
    setDateBeingChanged(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekProps.component.week]);

  useEffect(() => {
    if (isResizing) {
      setDateBeingChanged(dateBeingChanged);
      setIsFormOpen(false);
    }
  }, [dateBeingChanged, isResizing]);

  useEffect(() => {
    // const isStaleDraft = !isDrafting && (isResizing || isDragging);
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
  }, [isDrafting]);

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
