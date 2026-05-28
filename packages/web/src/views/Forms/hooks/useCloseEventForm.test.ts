import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import {
  CursorItem,
  closeFloatingAtCursor,
  isOpenAtCursor,
  setFloatingNodeIdAtCursor,
  setFloatingOpenAtCursor,
  setFloatingReferenceAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it } from "bun:test";

let actions: unknown[] = [];

const createStore = () =>
  configureStore({
    preloadedState: createInitialState(),
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }).concat(() => (next) => (action) => {
        actions.push(action);
        return next(action);
      }),
  });

const { useCloseEventForm } =
  require("@web/views/Forms/hooks/useCloseEventForm") as typeof import("@web/views/Forms/hooks/useCloseEventForm");

describe("useCloseEventForm", () => {
  beforeEach(() => {
    actions = [];
    closeFloatingAtCursor();
  });

  it("should close floating at cursor and set draft to null", () => {
    const store = createStore();
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(Provider, { children, store });
    const { result } = renderHook(() => useCloseEventForm(), { wrapper });
    const reference = document.createElement("div");

    setFloatingNodeIdAtCursor(CursorItem.EventForm);
    setFloatingReferenceAtCursor(reference);
    setFloatingOpenAtCursor(true);

    result.current();

    expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);
    expect(actions).toContainEqual(draftSlice.actions.discard(undefined));
  });
});
