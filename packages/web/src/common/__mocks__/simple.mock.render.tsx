import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render as rtlRender } from "@testing-library/react";
import { reducers } from "@web/store/reducers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

function render(
  ui: JSX.Element,
  {
    preloadedState,
    store = configureStore({ reducer: reducers, preloadedState }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>{children}</Provider>;
      </DndProvider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// re-export everything
export * from "@testing-library/react";
// override render method
export { render };
