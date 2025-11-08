import { PropsWithChildren, ReactElement } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { configureStore } from "@reduxjs/toolkit";
import { RenderOptions, render, renderHook } from "@testing-library/react";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { theme } from "@web/common/styles/theme";
import { GlobalStyle } from "@web/components/GlobalStyle";
import type { store as compassStore } from "@web/store";
import { reducers } from "@web/store/reducers";
import { sagas } from "@web/store/sagas";

type CustomRenderOptions = Omit<RenderOptions, "wrapper"> & {
  state?: any;
  store?: typeof compassStore;
};

const AllTheProviders =
  (store: typeof compassStore) =>
  ({ children }: PropsWithChildren<{}>) => {
    return (
      <DndProvider backend={HTML5Backend}>
        <GoogleOAuthProvider clientId="anyClientId">
          <GlobalStyle />
          <ThemeProvider theme={theme}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Provider store={store}>{children}</Provider>
            </BrowserRouter>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </DndProvider>
    );
  };

const customRender = (
  ui: ReactElement,
  {
    state,
    store = configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      reducer: reducers,
      preloadedState: state,
    }),
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  sagaMiddleware.run(sagas);

  const options: RenderOptions = { ...renderOptions };
  // wraps test component with providers
  return render(ui, { wrapper: AllTheProviders(store), ...options });
};

const customRenderHook = <ReturnType, Props>(
  hook: (props: Props) => ReturnType,
  {
    state,
    store = configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      reducer: reducers,
      preloadedState: state,
    }),
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  sagaMiddleware.run(sagas);

  const options: RenderOptions = { ...renderOptions };
  // wraps test component with providers
  return renderHook(hook, { wrapper: AllTheProviders(store), ...options });
};

export * from "@testing-library/react";
export { customRender as render, customRenderHook as renderHook };
