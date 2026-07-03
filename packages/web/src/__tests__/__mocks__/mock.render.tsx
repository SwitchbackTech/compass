import { type PreloadedState } from "@reduxjs/toolkit";
import {
  type RenderHookOptions,
  type RenderOptions,
  render,
  renderHook,
} from "@testing-library/react";
import {
  type ComponentType,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { RouterProvider, type RouterProviderProps } from "react-router-dom";
import { type Store } from "redux";
import { ID_ROOT } from "@web/common/constants/web.constants";
import { useSetupMovementEvents } from "@web/common/pointer/useMovementEvent";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { CompassRequiredProviders } from "@web/components/CompassProvider/CompassProvider";
import { createCompassStore, type RootState } from "@web/store";
import { mock } from "bun:test";

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children?: unknown }) => children,
  useGoogleLogin: () => mock(),
}));

interface CustomRenderOptions extends RenderOptions {
  state?: PreloadedState<RootState>;
  store?: Store<RootState>;
  router?: RouterProviderProps["router"];
  wrapper?: ComponentType<PropsWithChildren>;
}

interface CustomRenderHookOptions<Props>
  extends CustomRenderOptions,
    Omit<RenderHookOptions<Props>, "wrapper"> {}

interface TestProvidersProps {
  router?: RouterProviderProps["router"];
  store?: Store<RootState>;
}

function TestProvidersWrapper({
  children,
  router,
  store,
}: PropsWithChildren<TestProvidersProps>) {
  useSetupMovementEvents();

  if (!router) {
    return (
      <div id={ID_ROOT} data-testid={ID_ROOT}>
        <CompassRequiredProviders store={store}>
          {children}
        </CompassRequiredProviders>
      </div>
    );
  }

  return (
    <div id={ID_ROOT} data-testid={ID_ROOT}>
      <CompassRequiredProviders store={store}>
        <RouterProvider
          router={router}
          fallbackElement={<AbsoluteOverflowLoader />}
          future={{
            // Test-only: sync RouterProvider state updates (no startTransition).
            // Matches initial render + client navigations with RTL act() without globals.
            v7_startTransition: false,
          }}
        />
      </CompassRequiredProviders>
    </div>
  );
}

const customRender = (
  ui: ReactElement,
  {
    state,
    router,
    store = createCompassStore({
      preloadedState: state,
      queryClient: createCompassQueryClient(),
    }),
    wrapper: CustomWrapper,
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  const options: RenderOptions = { ...renderOptions };
  const Wrapper = ({ children }: PropsWithChildren) => {
    if (!CustomWrapper) {
      return (
        <TestProvidersWrapper router={router} store={store}>
          {children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper router={router} store={store}>
        <CustomWrapper>{children}</CustomWrapper>
      </TestProvidersWrapper>
    );
  };

  // wraps test component with providers
  return render(ui, {
    wrapper: Wrapper,
    ...options,
  });
};

const customRenderHook = <ReturnType, Props>(
  hook: (props: Props) => ReturnType,
  {
    wrapper: WrapperComponent,
    state,
    router,
    store = createCompassStore({
      preloadedState: state,
      queryClient: createCompassQueryClient(),
    }),
    ...renderOptions
  }: CustomRenderHookOptions<Props> = {},
) => {
  const options: RenderHookOptions<Props> = { ...renderOptions };

  const Wrapper = (props: PropsWithChildren) => {
    if (!WrapperComponent) {
      return (
        <TestProvidersWrapper router={router} store={store}>
          {props.children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper router={router} store={store}>
        <WrapperComponent {...options.initialProps} {...props} />
      </TestProvidersWrapper>
    );
  };

  // wraps test component with providers
  return renderHook(hook, {
    wrapper: Wrapper,
    ...options,
  });
};

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
