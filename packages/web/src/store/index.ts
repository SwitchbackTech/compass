import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { combineReducers } from "redux";
import { queryClient } from "@web/common/query/query-client";
import { createEventListenerMiddleware } from "@web/ducks/events/listeners/event.listeners";
import { reducers } from "./reducers";

const rootReducer = combineReducers(reducers);
export type RootState = ReturnType<typeof rootReducer>;

interface CreateCompassStoreOptions {
  preloadedState?: PreloadedState<RootState>;
  queryClient?: QueryClient;
}

export const createCompassStore = (options: CreateCompassStoreOptions = {}) => {
  const eventListenerMiddleware = createEventListenerMiddleware(
    options.queryClient ?? queryClient,
  );

  return configureStore({
    reducer: rootReducer,
    preloadedState: options.preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(eventListenerMiddleware.middleware),
  });
};

export const store = createCompassStore();

if (typeof window !== "undefined") {
  window.__COMPASS_E2E_STORE__ = store;
}

export type AppDispatch = typeof store.dispatch;
