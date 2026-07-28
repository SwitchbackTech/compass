import { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { draftActions } from "@web/events/stores/draft.store";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "../state/useDraftState";

const clearGestureEphemera = (setters: Setters_Draft) => {
  setters.setIsDragging(false);
  setters.setIsResizing(false);
  setters.setDragStatus(null);
  setters.setResizeStatus(null);
  setters.setDateBeingChanged(null);
  setters.setGestureOriginDraft(null);
};

export const useDraftEffects = (
  state: State_Draft_Local,
  setters: Setters_Draft,
  weekProps: WeekProps,
  isDrafting: boolean,
  handleChange: () => Promise<void>,
) => {
  const { draft, isDragging, isResizing, dateBeingChanged } = state;
  const {
    setIsDragging,
    setIsFormOpen,
    setIsResizing,
    setResizeStatus,
    setDragStatus,
    setDateBeingChanged,
    setGestureOriginDraft,
  } = setters;
  const isFirstWeekEffectRef = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft state should clear only when the visible week changes.
  useEffect(() => {
    // Skip mount: discarding here would wipe a draft that was just seeded
    // into the store before the provider mounted.
    if (isFirstWeekEffectRef.current) {
      isFirstWeekEffectRef.current = false;
      return;
    }

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

    clearGestureEphemera(setters);
    // With store-owned draft values, week navigation must discard the
    // canonical draft (previously only the local portal copy was cleared).
    draftActions.discard();
  }, [weekProps.component.week]);

  useEffect(() => {
    if (isResizing) {
      setDateBeingChanged(dateBeingChanged);
      setIsFormOpen(false);
    }
  }, [dateBeingChanged, isResizing, setDateBeingChanged, setIsFormOpen]);

  useEffect(() => {
    const isStaleDraft = !isDrafting;
    if (isStaleDraft) {
      setIsDragging(false);
      setIsFormOpen(false);
      setIsResizing(false);
      setDragStatus(null);
      setResizeStatus(null);
      setDateBeingChanged(null);
      setGestureOriginDraft(null);
    }
  }, [
    isDrafting,
    setDateBeingChanged,
    setDragStatus,
    setGestureOriginDraft,
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
      const { start, end } = draft.values.schedule;
      const durationMin = dayjs(end).diff(start, "minutes");

      setDragStatus((dragStatus) => ({
        durationMin,
        hasMoved: dragStatus?.hasMoved,
      }));
    }
  }, [isDragging, setDragStatus, draft, setIsFormOpen]);
};
