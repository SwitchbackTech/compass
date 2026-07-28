import { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { draftActions } from "@web/events/stores/draft.store";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "../state/useDraftState";

/** Clears Week-local gesture flags; does not touch the store draft. */
export const clearGestureEphemera = (setters: Setters_Draft) => {
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
  const { draft, isDragging, isResizing } = state;
  const { setIsFormOpen, setDragStatus } = setters;
  const isFirstWeekEffectRef = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft state should clear only when the visible week changes.
  useEffect(() => {
    // Skip mount: discarding here would wipe a draft that was just seeded
    // into the store before the provider mounted.
    if (isFirstWeekEffectRef.current) {
      isFirstWeekEffectRef.current = false;
      return;
    }

    // Drag-to-edge week changes happen while isDragging/isResizing is true,
    // so this early return also preserves the in-flight draft.
    if (isDragging || isResizing) {
      return;
    }

    clearGestureEphemera(setters);
    draftActions.discard();
  }, [weekProps.component.week]);

  useEffect(() => {
    if (isResizing) {
      setIsFormOpen(false);
    }
  }, [isResizing, setIsFormOpen]);

  useEffect(() => {
    if (isDrafting) return;
    clearGestureEphemera(setters);
    setIsFormOpen(false);
  }, [isDrafting, setIsFormOpen, setters]);

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
