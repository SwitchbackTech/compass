import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  type RenderHookOptions,
  render,
  renderHook,
} from "@testing-library/react";
import { type PropsWithChildren, type ReactElement } from "react";
import { Provider } from "react-redux";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { type RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { seedEventQueries } from "./utils/event-query-test-data";

type StoreOptions = {
  /** Seed the event query cache  */
  events?: Array<{ _id?: string }>;
};

export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: reducers,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
}

export function createStoreWrapper(
  preloadedState?: PreloadedState<RootState>,
  { events }: StoreOptions = {},
) {
  const store = createTestStore(preloadedState);
  const queryClient = createCompassQueryClient();
  if (events?.length) seedEventQueries(queryClient, events);

  function StoreWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>{children}</Provider>
      </QueryClientProvider>
    );
  }

  return { queryClient, store, wrapper: StoreWrapper };
}

export function renderWithStore(
  ui: ReactElement,
  preloadedState?: PreloadedState<RootState>,
  options?: StoreOptions,
) {
  const { store, wrapper } = createStoreWrapper(preloadedState, options);

  return {
    store,
    ...render(ui, { wrapper }),
  };
}

export function renderHookWithStore<Result, Props>(
  hook: (initialProps: Props) => Result,
  preloadedState?: PreloadedState<RootState>,
  options?: Omit<RenderHookOptions<Props>, "wrapper"> & StoreOptions,
) {
  const { events, ...renderHookOptions } = options ?? {};
  const { store, wrapper } = createStoreWrapper(preloadedState, { events });

  return {
    store,
    ...renderHook(hook, { ...renderHookOptions, wrapper }),
  };
}
