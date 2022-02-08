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
  describe("dayTimes", () => {
    it("has 24 intervals (1 per hour)", () => {
      const store = configureStore({
        reducer: reducers,
      });
      const wrapper = ({ children }) => (
        <ReduxProvider reduxStore={store}>{children}</ReduxProvider>
      );
      const { result } = renderHook(() => useGetWeekViewProps(), { wrapper });
      const dayTimes = result.current.component.dayTimes;
      expect(dayTimes.length).toBe(23); // 23 cuz 0 index
    });
  });
});
