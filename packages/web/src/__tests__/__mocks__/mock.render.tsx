import React, { ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { configureStore } from "@reduxjs/toolkit";
import { render, RenderOptions } from "@testing-library/react";
import { sagas } from "@web/store/sagas";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { reducers } from "@web/store/reducers";
import { ThemeProvider } from "styled-components";
import { theme } from "@web/common/styles/theme";
import { GlobalStyle } from "@web/components/GlobalStyle";

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
  } = {}
) => {
  sagaMiddleware.run(sagas);

  const AllTheProviders = ({ children }) => {
    return (
      <DndProvider backend={HTML5Backend}>
        <GoogleOAuthProvider clientId="anyClientId">
          <GlobalStyle />
          <ThemeProvider theme={theme}>
            <BrowserRouter>
              <Provider store={store}>{children}</Provider>
            </BrowserRouter>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </DndProvider>
    );
  };

  const options: RenderOptions = { ...renderOptions };
  // wraps test component with providers
  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from "@testing-library/react";
export { customRender as render };
