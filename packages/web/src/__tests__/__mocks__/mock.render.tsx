import { type PreloadedState } from "@reduxjs/toolkit";
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
import { type Store } from "redux";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
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
  queryClient?: QueryClient;
  store?: Store<RootState>;
  router?: RouterProviderProps["router"];
  wrapper?: ComponentType<PropsWithChildren>;
}

interface CustomRenderHookOptions<Props>
  extends CustomRenderOptions,
    Omit<RenderHookOptions<Props>, "wrapper"> {}

interface TestProvidersProps {
  queryClient?: QueryClient;
  router?: RouterProviderProps["router"];
  store?: Store<RootState>;
}

function TestProvidersWrapper({
  children,
  queryClient,
  router,
  store,
}: PropsWithChildren<TestProvidersProps>) {
  useSetupMovementEvents();

  if (!router) {
    return (
      <div id={ID_ROOT} data-testid={ID_ROOT}>
        <CompassRequiredProviders queryClient={queryClient} store={store}>
          {children}
        </CompassRequiredProviders>
      </div>
    );
  }

  return (
    <div id={ID_ROOT} data-testid={ID_ROOT}>
      <CompassRequiredProviders queryClient={queryClient} store={store}>
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
    store = createCompassStore({
      preloadedState: state,
      queryClient,
    }),
    wrapper: CustomWrapper,
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  const findNestedStore = (node: unknown): Store<RootState> | undefined => {
    if (!node || typeof node !== "object" || !("props" in node)) return;
    const props = (
      node as { props: { children?: unknown; store?: Store<RootState> } }
    ).props;
    if (props.store) return props.store;
    const children = Array.isArray(props.children)
      ? props.children
      : [props.children];
    for (const child of children) {
      const childStore = findNestedStore(child);
      if (childStore) return childStore;
    }
  };
  const nestedStore = findNestedStore(ui);
  const eventQueryTestEvents = (
    (nestedStore ?? store) as Store<RootState> & {
      __eventQueryTestEvents?: Array<{ _id?: string }>;
    }
  ).__eventQueryTestEvents;
  if (eventQueryTestEvents?.length) {
    queryClient.setQueryDefaults(["events"], {
      initialData: toNormalizedEventQueryData(eventQueryTestEvents),
    });
  }
  const options: RenderOptions = { ...renderOptions };
  const Wrapper = ({ children }: PropsWithChildren) => {
    if (!CustomWrapper) {
      return (
        <TestProvidersWrapper
          queryClient={queryClient}
          router={router}
          store={store}
        >
          {children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper
        queryClient={queryClient}
        router={router}
        store={store}
      >
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
    store = createCompassStore({
      preloadedState: state,
      queryClient,
    }),
    ...renderOptions
  }: CustomRenderHookOptions<Props> = {},
) => {
  const options: RenderHookOptions<Props> = { ...renderOptions };

  const Wrapper = (props: PropsWithChildren) => {
    if (!WrapperComponent) {
      return (
        <TestProvidersWrapper
          queryClient={queryClient}
          router={router}
          store={store}
        >
          {props.children}
        </TestProvidersWrapper>
      );
    }

    return (
      <TestProvidersWrapper
        queryClient={queryClient}
        router={router}
        store={store}
      >
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
