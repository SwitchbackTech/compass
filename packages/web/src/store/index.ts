import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import { type QueryClient } from "@tanstack/react-query";
import { type StateFromReducersMapObject } from "redux";
import { reducers } from "./reducers";

export interface CreateCompassStoreOptions {
  queryClient?: QueryClient;
  preloadedState?: PreloadedState<StateFromReducersMapObject<typeof reducers>>;
}

export const createCompassStore = ({
  preloadedState,
}: CreateCompassStoreOptions = {}) => {
  const baseStore = configureStore({
    reducer: reducers,
    preloadedState,
  });

  return baseStore;
};

export const store = createCompassStore();

// Expose store for e2e testing (always expose, let tests opt-in via flag)
if (typeof window !== "undefined") {
  window.__COMPASS_E2E_STORE__ = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
