import { useEffect } from "react";
import dayjs from "dayjs";
import { Setters_Draft, State_Draft_Local } from "../state/useDraftState";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

export const useDraftEffects = (
  state: State_Draft_Local,
  setters: Setters_Draft,
  weekProps: WeekProps,
  isDrafting: boolean,
  handleChange: () => Promise<void>,
) => {
  const { draft, isDragging, isResizing, isFormOpen, dateBeingChanged } = state;
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
    if (isDragging) {
      setIsFormOpen(false);
      setDraft((_draft) => {
        const durationMin = dayjs(_draft.endDate).diff(
          _draft.startDate,
          "minutes",
        );

        setDragStatus({
          durationMin,
        });

        return draft;
      });
    }
  }, [isDragging]);
};
