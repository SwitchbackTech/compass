import {
  ComponentType,
  PropsWithChildren,
  ReactElement,
  isValidElement,
} from "react";
import { RouterProvider, RouterProviderProps } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import {
  RenderHookOptions,
  RenderOptions,
  render,
  renderHook,
} from "@testing-library/react";
import { ID_ROOT } from "@web/common/constants/web.constants";
import { useSetupKeyboardEvents } from "@web/common/hooks/useKeyboardEvent";
import { useSetupMovementEvents } from "@web/common/hooks/useMovementEvent";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { CompassRequiredProviders } from "@web/components/CompassProvider/CompassProvider";
import type { store as compassStore } from "@web/store";
import { reducers } from "@web/store/reducers";
import { sagas } from "@web/store/sagas";

interface CustomRenderOptions extends RenderOptions {
  state?: any;
  store?: typeof compassStore;
  router?: RouterProviderProps["router"];
  wrapper?: ComponentType<PropsWithChildren>;
}

interface CustomRenderHookOptions<Props>
  extends CustomRenderOptions,
    Omit<RenderHookOptions<Props>, "wrapper"> {}

const TestProviders = (props?: {
  router?: RouterProviderProps["router"];
  store?: typeof compassStore;
}) => {
  return function TestProvidersWrapper({ children }: PropsWithChildren) {
    useSetupKeyboardEvents();
    useSetupMovementEvents();

    if (!props?.router) {
      return (
        <div id={ID_ROOT} data-testid={ID_ROOT}>
          <CompassRequiredProviders {...props}>
            {children}
          </CompassRequiredProviders>
        </div>
      );
    }

    if (isValidElement(children)) {
      console.warn(
        "When providing a router, children is not a valid option and will be ignored.",
      );
    }

    return (
      <div id={ID_ROOT} data-testid={ID_ROOT}>
        <CompassRequiredProviders store={props?.store}>
          <RouterProvider
            router={props.router}
            fallbackElement={<AbsoluteOverflowLoader />}
            future={{
              v7_startTransition: true,
            }}
          />
        </CompassRequiredProviders>
      </div>
    );
  };
};

const customRender = (
  ui: ReactElement,
  {
    state,
    router,
    store = configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      reducer: reducers,
      preloadedState: state,
    }),
    wrapper: CustomWrapper,
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  sagaMiddleware.run(sagas);

  const options: RenderOptions = { ...renderOptions };
  const BaseProviders = TestProviders({ store, router });

  const Wrapper = ({ children }: PropsWithChildren) => {
    if (!CustomWrapper) return <BaseProviders>{children}</BaseProviders>;

    return (
      <BaseProviders>
        <CustomWrapper>{children}</CustomWrapper>
      </BaseProviders>
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
    store = configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      reducer: reducers,
      preloadedState: state,
    }),
    ...renderOptions
  }: CustomRenderHookOptions<Props> = {},
) => {
  sagaMiddleware.run(sagas);

  const options: RenderHookOptions<Props> = { ...renderOptions };
  const BaseProviders = TestProviders({ store, router });

  const Wrapper = (props: PropsWithChildren) => {
    useSetupKeyboardEvents();
    useSetupMovementEvents();

    if (!WrapperComponent) return <BaseProviders {...props} />;

    return (
      <BaseProviders>
        <WrapperComponent {...options.initialProps} {...props} />
      </BaseProviders>
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
