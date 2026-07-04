import { act } from "react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { draftActions } from "@web/events/stores/draft.store";
import { useDraftActions } from "@web/views/Week/components/Draft/hooks/actions/useDraftActions";
import { useDraftState } from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { useDateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useGridLayout } from "@web/views/Week/hooks/grid/useGridLayout";
import { useToday } from "@web/views/Week/hooks/useToday";
import { useWeek } from "@web/views/Week/hooks/useWeek";

export function setupDraftState(event: Schema_WebEvent) {
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

  const weekHook = renderHook(() => useWeek(useToday().today), { state });
  const weekProps = weekHook.result.current;

  const gridHook = renderHook(() => useGridLayout(), {
    state,
  });

  const { gridRefs, measurements } = gridHook.result.current;
  const draftState = renderHook(useDraftState, { state });
  const { state: originalState, setters } = draftState.result.current;

  act(() => {
    draftActions.start({
      activity: "sidebarClick",
      event: event as Schema_Event,
      eventType: Categories_Event.SOMEDAY_WEEK,
    });
  });

  const dateHook = renderHook(
    () => useDateCalcs(measurements, gridRefs.mainGridRef),
    { state },
  );

  const dateCalcs = dateHook.result.current;

  const actions = renderHook(
    () =>
      useDraftActions(
        { ...originalState, draft },
        setters,
        dateCalcs,
        weekProps,
      ),
    { state },
  );

  const { deleteEvent, submit } = actions.result.current;

  expect(weekProps).toBeDefined();
  expect(dateCalcs).toBeDefined();

  return {
    weekProps,
    dateCalcs,
    deleteEvent,
    submit,
    draft,
    rerenderActions: actions.rerender,
  };
}
