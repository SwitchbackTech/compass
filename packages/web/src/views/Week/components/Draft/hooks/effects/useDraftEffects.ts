import { useEffect } from "react";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { type InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "../state/useDraftState";

export const useDraftEffects = (
  state: State_Draft_Local,
  setters: Setters_Draft,
  weekProps: WeekProps,
  isDrafting: boolean,
  handleChange: () => Promise<void>,
  interaction: InteractionEngine,
) => {
  const { isResizing, dateBeingChanged } = state;
  const { setDraft, setIsFormOpen, setIsResizing, setDateBeingChanged } =
    setters;

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft state should clear only when the visible week changes.
  useEffect(() => {
    const isInteracting = interaction.getSnapshot().mode !== "idle";

    if (isInteracting || isResizing) {
      return;
    }

    // Only skip clearing if we're currently dragging AND the week change was due to drag-to-edge navigation
    const lastNavigationSource = weekProps.util.getLastNavigationSource();
    const isDragToEdgeNavigation = lastNavigationSource === "drag-to-edge";
    const shouldPreserveDuringDrag =
      (isInteracting || isResizing) && isDragToEdgeNavigation;

    if (shouldPreserveDuringDrag) {
      return;
    }

    setDraft(null);
    interaction.reset();
    setIsFormOpen(false);
    setIsResizing(false);
    setDateBeingChanged(null);
  }, [weekProps.component.week]);

  useEffect(() => {
    const isActivelyResizing = interaction.getSnapshot().mode === "resize";

    if (isResizing && isActivelyResizing) {
      setDateBeingChanged(dateBeingChanged);
      setIsFormOpen(false);
    }
  }, [
    dateBeingChanged,
    interaction,
    isResizing,
    setDateBeingChanged,
    setIsFormOpen,
  ]);

  useEffect(() => {
    const isStaleDraft = !isDrafting;
    if (isStaleDraft) {
      setDraft(null);
      interaction.reset();
      setIsFormOpen(false);
      setIsResizing(false);
      setDateBeingChanged(null);
    }
  }, [
    interaction,
    isDrafting,
    setDateBeingChanged,
    setDraft,
    setIsFormOpen,
    setIsResizing,
  ]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);
};
