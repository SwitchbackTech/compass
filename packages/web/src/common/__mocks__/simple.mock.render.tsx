import React from "react";
import { Provider } from "react-redux";
import { configureStore, PreloadedState } from "@reduxjs/toolkit";
import { render as rtlRender } from "@testing-library/react";
import { reducers } from "@web/store/reducers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const customRender = (
  ui: JSX.Element,
  {
    preloadedState,
    store = configureStore({ reducer: reducers, preloadedState }),
    ...renderOptions
  } = {}
) => {
  const AllTheProviders = ({ children }) => {
    return (
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>{children}</Provider>;
      </DndProvider>
    );
  };
  return rtlRender(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// re-export everything
export * from "@testing-library/react";
// override render method
export { customRender as render };
