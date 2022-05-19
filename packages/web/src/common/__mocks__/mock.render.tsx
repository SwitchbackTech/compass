import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { sagas } from "@web/store/sagas";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { reducers } from "@web/store/reducers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const customRender = (
  ui: JSX.Element,
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
        <Provider store={store}>{children}</Provider>;
      </DndProvider>
    );
  };

  // wraps each test component with our providers by
  // extending React's default render
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// re-export everything
export * from "@testing-library/react";
// override render method
export { customRender as render };
