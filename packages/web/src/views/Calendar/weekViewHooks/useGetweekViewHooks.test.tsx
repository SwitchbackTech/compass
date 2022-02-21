import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react-hooks";

import { reducers } from "@web/store/reducers";
import { useGetWeekViewProps } from "./useGetWeekViewProps";

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
  const { core, component } = result.current;
  describe("allDayEventsMaxCount", () => {
    it("is never less than 1", () => {
      expect(component.allDayEventsMaxCount).toBeGreaterThanOrEqual(1);
    });
    it("idk yet", () => {
      const f = core.getAllDayEventWidth(2, 3);
      const y = "";
    });
  });
});
