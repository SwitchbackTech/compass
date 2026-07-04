import { type QueryClient } from "@tanstack/react-query";
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
import { seedEventQueries } from "@web/__tests__/utils/event-query-test-data";
import {
  seedStoresFromState,
  type TestAppState,
} from "@web/__tests__/utils/state/seed-stores";
import { ID_ROOT } from "@web/common/constants/web.constants";
import { useSetupMovementEvents } from "@web/common/pointer/useMovementEvent";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { CompassRequiredProviders } from "@web/components/CompassProvider/CompassProvider";
import { mock } from "bun:test";

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children?: unknown }) => children,
  useGoogleLogin: () => mock(),
}));

interface CustomRenderOptions extends RenderOptions {
  state?: TestAppState;
  queryClient?: QueryClient;
  router?: RouterProviderProps["router"];
  wrapper?: ComponentType<PropsWithChildren>;
  /** Seed the event query cache directly (replaces the Redux→query bridge). */
  events?: Array<{ _id?: string }>;
}

interface CustomRenderHookOptions<Props>
  extends CustomRenderOptions,
    Omit<RenderHookOptions<Props>, "wrapper"> {}

interface TestProvidersProps {
  queryClient?: QueryClient;
  router?: RouterProviderProps["router"];
}

function TestProvidersWrapper({
  children,
  queryClient,
  router,
}: PropsWithChildren<TestProvidersProps>) {
  useSetupMovementEvents();

  if (!router) {
    return (
      <div id={ID_ROOT} data-testid={ID_ROOT}>
        <CompassRequiredProviders queryClient={queryClient}>
          {children}
        </CompassRequiredProviders>
      </div>
    );
  }

  return (
    <div id={ID_ROOT} data-testid={ID_ROOT}>
      <CompassRequiredProviders queryClient={queryClient}>
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
    queryClient = createCompassQueryClient(),
    wrapper: CustomWrapper,
    events,
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  seedStoresFromState(state);
  if (events?.length) seedEventQueries(queryClient, events);
  const options: RenderOptions = { ...renderOptions };
  const Wrapper = ({ children }: PropsWithChildren) => {
    if (!CustomWrapper) {
      return (
        <TestProvidersWrapper queryClient={queryClient} router={router}>
          {children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper queryClient={queryClient} router={router}>
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
    queryClient = createCompassQueryClient(),
    events,
    ...renderOptions
  }: CustomRenderHookOptions<Props> = {},
) => {
  seedStoresFromState(state);
  if (events?.length) seedEventQueries(queryClient, events);
  const options: RenderHookOptions<Props> = { ...renderOptions };

  const Wrapper = (props: PropsWithChildren) => {
    if (!WrapperComponent) {
      return (
        <TestProvidersWrapper queryClient={queryClient} router={router}>
          {props.children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper queryClient={queryClient} router={router}>
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
