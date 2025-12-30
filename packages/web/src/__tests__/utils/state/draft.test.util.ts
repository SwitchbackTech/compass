import { act } from "react";
import { useDispatch } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { reducers } from "@web/store/reducers";
import { useDraftActions } from "@web/views/Calendar/components/Draft/hooks/actions/useDraftActions";
import { useDraftState } from "@web/views/Calendar/components/Draft/hooks/state/useDraftState";
import { useDateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useGridLayout } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useToday } from "@web/views/Calendar/hooks/useToday";
import { useWeek } from "@web/views/Calendar/hooks/useWeek";

export function setupDraftState(
  event: Schema_WebEvent,
  options?: {
    store?: ReturnType<typeof configureStore>;
    spyOnDispatch?: boolean;
  },
) {
  const isSidebarOpen = true;
  const draft = assembleGridEvent(event);

  const state = {
    events: {
      draft: {
        status: {
          activity: null,
          isDrafting: false,
          eventType: null,
          dateToResize: null,
        },
        event: draft,
      },
    },
  };

  const store =
    options?.store ??
    configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(sagaMiddleware),
      reducer: reducers,
      preloadedState: state,
    });

  const dispatchSpy = options?.spyOnDispatch
    ? jest.spyOn(store, "dispatch")
    : undefined;

  const weekHook = renderHook(() => useWeek(useToday().today), { store });
  const weekProps = weekHook.result.current;
  const { week } = weekProps.component;
  const dispatch = renderHook(useDispatch, { store }).result.current;

  const gridHook = renderHook(() => useGridLayout(isSidebarOpen, week), {
    store,
  });

  const { gridRefs, measurements } = gridHook.result.current;
  const draftState = renderHook(useDraftState, { store });
  const { state: originalState, setters } = draftState.result.current;

  act(() => {
    dispatch(
      draftSlice.actions.start({
        activity: "sidebarClick",
        event: event as Schema_Event,
        eventType: Categories_Event.SOMEDAY_WEEK,
      }),
    );
  });

  const dateHook = renderHook(
    () => useDateCalcs(measurements, gridRefs.mainGridRef),
    { store },
  );

  const dateCalcs = dateHook.result.current;

  const actions = renderHook(
    () =>
      useDraftActions(
        { ...originalState, draft },
        setters,
        dateCalcs,
        weekProps,
        isSidebarOpen,
      ),
    { store },
  );

  const { deleteEvent, submit } = actions.result.current;

  expect(weekProps).toBeDefined();
  expect(dateCalcs).toBeDefined();

  return {
    weekProps,
    dateCalcs,
    deleteEvent,
    dispatch,
    isSidebarOpen,
    submit,
    draft,
    rerenderActions: actions.rerender,
    store,
    dispatchSpy,
  };
}
