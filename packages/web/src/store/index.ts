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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
