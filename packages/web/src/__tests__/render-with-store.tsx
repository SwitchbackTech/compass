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
import { eventQueryKeys } from "@web/ducks/events/queries/event.query.keys";
import { type RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { toNormalizedEventQueryData } from "./utils/event-query-test-data";

export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  const legacyEvents = Object.values(
    ((preloadedState as { events?: { entities?: { value?: object } } })?.events
      ?.entities?.value ?? {}) as Record<string, never>,
  );
  const store = configureStore({
    reducer: reducers,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
  return Object.assign(store, { __eventQueryTestEvents: legacyEvents });
}

export function createStoreWrapper(preloadedState?: PreloadedState<RootState>) {
  const store = createTestStore(preloadedState);
  const queryClient = createCompassQueryClient();
  if (store.__eventQueryTestEvents.length > 0) {
    const events = store.__eventQueryTestEvents as Array<{ _id?: string }>;
    queryClient.setQueryDefaults(eventQueryKeys.all, {
      initialData: toNormalizedEventQueryData(events),
    });
  }
  const legacyEvents = (preloadedState as { events?: Record<string, unknown> })
    ?.events;
  const entities =
    (legacyEvents?.entities as { value?: Record<string, never> })?.value ?? {};
  const dates = preloadedState?.view?.dates;
  if (dates) {
    const setLegacyQuery = (
      scope: "day" | "week" | "someday",
      sliceName: "getDayEvents" | "getWeekEvents" | "getSomedayEvents",
    ) => {
      const ids = (
        legacyEvents?.[sliceName] as { value?: { data?: string[] } | null }
      )?.value?.data;
      if (!ids) return;
      const queryKey =
        scope === "day"
          ? eventQueryKeys.day({
              source: "local",
              startDate: dates.start,
              endDate: dates.end,
            })
          : eventQueryKeys.list({
              source: "local",
              scope,
              params: {
                startDate: dates.start,
                endDate: dates.end,
                someday: scope === "someday",
              },
            });
      queryClient.setQueryData(queryKey, { ids, entities });
    };
    setLegacyQuery("day", "getDayEvents");
    setLegacyQuery("week", "getWeekEvents");
    setLegacyQuery("someday", "getSomedayEvents");
  }

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
) {
  const { store, wrapper } = createStoreWrapper(preloadedState);

  return {
    store,
    ...render(ui, { wrapper }),
  };
}

export function renderHookWithStore<Result, Props>(
  hook: (initialProps: Props) => Result,
  preloadedState?: PreloadedState<RootState>,
  options?: Omit<RenderHookOptions<Props>, "wrapper">,
) {
  const { store, wrapper } = createStoreWrapper(preloadedState);

  return {
    store,
    ...renderHook(hook, { ...options, wrapper }),
  };
}
