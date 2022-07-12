import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { reducers } from "@web/store/reducers";

import { useGetWeekViewProps } from "../../views/Calendar/weekViewHooks/useGetWeekViewProps";

const ReduxProvider = ({ children, reduxStore }) => (
  <Provider store={reduxStore}>{children}</Provider>
);

describe("component", () => {
  const store = configureStore({
    reducer: reducers,
  });
  const wrapper = ({ children }) => (
    <ReduxProvider reduxStore={store}>{children}</ReduxProvider>
  );

  const { result } = renderHook(() => useGetWeekViewProps(), { wrapper });
  const { component } = result.current;
  describe("rowsCount", () => {
    it("is never less than 1", () => {
      expect(component.rowsCount).toBeGreaterThanOrEqual(1);
    });
  });
});
