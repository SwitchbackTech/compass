import { createListenerMiddleware } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";

export interface CompassListenerDependencies {
  queryClient: QueryClient;
}

export const createCompassListenerMiddleware = (queryClient: QueryClient) =>
  createListenerMiddleware({
    extra: {
      queryClient,
    } satisfies CompassListenerDependencies,
  });
