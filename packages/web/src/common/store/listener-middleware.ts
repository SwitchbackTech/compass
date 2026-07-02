import {
  createListenerMiddleware,
  type TypedStartListening,
} from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { type AppDispatch, type RootState } from "@web/store";

export interface CompassListenerDependencies {
  queryClient: QueryClient;
}

export type CompassStartListening = TypedStartListening<
  RootState,
  AppDispatch,
  CompassListenerDependencies
>;

export const createCompassListenerMiddleware = (queryClient: QueryClient) =>
  createListenerMiddleware({
    extra: {
      queryClient,
    } satisfies CompassListenerDependencies,
  });
