import { type PreloadedState } from "@reduxjs/toolkit";
import {
  type RenderHookOptions,
  render,
  renderHook,
} from "@testing-library/react";
import { type PropsWithChildren, type ReactElement } from "react";
import { Provider } from "react-redux";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { createCompassStore, type RootState } from "@web/store";

export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return createCompassStore({
    preloadedState,
    queryClient: createCompassQueryClient(),
  });
}

export function createStoreWrapper(preloadedState?: PreloadedState<RootState>) {
  const store = createTestStore(preloadedState);

  function StoreWrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, wrapper: StoreWrapper };
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
