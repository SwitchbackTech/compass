import { type AnyAction } from "@reduxjs/toolkit";

export interface WeekInteractionRuntimeMetrics {
  ownedPointerDowns: number;
  pointerCancels: number;
  pointerDowns: number;
  pointerMoves: number;
  pointerUps: number;
  reactCommits: number;
  reduxDispatches: number;
}

export const createWeekInteractionRuntimeMetrics =
  (): WeekInteractionRuntimeMetrics => ({
    ownedPointerDowns: 0,
    pointerCancels: 0,
    pointerDowns: 0,
    pointerMoves: 0,
    pointerUps: 0,
    reactCommits: 0,
    reduxDispatches: 0,
  });

export const recordWeekInteractionRender = (
  metrics: WeekInteractionRuntimeMetrics,
) => {
  metrics.reactCommits += 1;
};

export const createMeasuredWeekInteractionDispatch =
  (
    dispatch: (action: AnyAction) => unknown,
    metrics: WeekInteractionRuntimeMetrics,
  ) =>
  (action: AnyAction) => {
    metrics.reduxDispatches += 1;
    return dispatch(action);
  };
