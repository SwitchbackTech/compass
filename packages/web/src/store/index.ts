import { configureStore } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "@web/common/query/query-client";
import {
  type CompassStartListening,
  createCompassListenerMiddleware,
} from "@web/common/store/listener-middleware";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { registerCompassListeners } from "./listeners";
import { reducers } from "./reducers";

export interface CreateCompassStoreOptions {
  queryClient?: QueryClient;
}

export const createCompassStore = ({
  queryClient = defaultQueryClient,
}: CreateCompassStoreOptions = {}) => {
  const listenerMiddleware = createCompassListenerMiddleware(queryClient);

  const baseStore = configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .concat(sagaMiddleware),
  });

  // Register listeners against this store's middleware
  registerCompassListeners(
    listenerMiddleware.startListening as CompassStartListening,
  );

  return baseStore;
};

export const store = createCompassStore();

// Expose store for e2e testing (always expose, let tests opt-in via flag)
if (typeof window !== "undefined") {
  window.__COMPASS_E2E_STORE__ = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
