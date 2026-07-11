import { QueryClientProvider } from "@tanstack/react-query";
import {
  type RenderHookOptions,
  render,
  renderHook,
} from "@testing-library/react";
import { type PropsWithChildren, type ReactElement } from "react";
import { type Event } from "@core/types/event.contracts";
import { createCompassQueryClient } from "@web/api/query-client";
import { seedEventQueries } from "./utils/event-query-test-data";
import {
  seedStoresFromState,
  type TestAppState,
} from "./utils/state/seed-stores";

type StoreOptions = {
  /** Seed the event query cache  */
  events?: Event[];
};

export function createStoreWrapper(
  state?: TestAppState,
  { events }: StoreOptions = {},
) {
  seedStoresFromState(state);
  const queryClient = createCompassQueryClient();
  if (events?.length) seedEventQueries(queryClient, events);

  function StoreWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { queryClient, wrapper: StoreWrapper };
}

export function renderWithStore(
  ui: ReactElement,
  state?: TestAppState,
  options?: StoreOptions,
) {
  const { wrapper } = createStoreWrapper(state, options);

  return render(ui, { wrapper });
}

export function renderHookWithStore<Result, Props>(
  hook: (initialProps: Props) => Result,
  state?: TestAppState,
  options?: Omit<RenderHookOptions<Props>, "wrapper"> & StoreOptions,
) {
  const { events, ...renderHookOptions } = options ?? {};
  const { wrapper } = createStoreWrapper(state, { events });

  return renderHook(hook, { ...renderHookOptions, wrapper });
}
