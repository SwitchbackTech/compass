import { configureStore, type PreloadedState } from "@reduxjs/toolkit";
import {
  type RenderHookOptions,
  render,
  renderHook,
} from "@testing-library/react";
import { type PropsWithChildren, type ReactElement } from "react";
import { Provider } from "react-redux";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { type RootState } from "@web/store";
import { reducers } from "@web/store/reducers";

export function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: reducers,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sagaMiddleware),
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
