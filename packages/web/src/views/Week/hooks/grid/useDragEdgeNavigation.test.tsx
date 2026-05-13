import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type FC, useCallback, useRef } from "react";
import { Provider } from "react-redux";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { SidebarDraftContext } from "@web/components/PlannerSidebar/draft/context/SidebarDraftContext";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import { type WeekProps } from "../useWeek";
import { useDragEdgeNavigation } from "./useDragEdgeNavigation";
import { describe, expect, it, mock } from "bun:test";

const timedDraft = {
  _id: "event-1",
  endDate: "2024-01-15T11:00:00.000Z",
  isAllDay: false,
  startDate: "2024-01-15T10:00:00.000Z",
} as Schema_GridEvent;

const createWeekProps = (): WeekProps =>
  ({
    component: {
      endOfView: dayjs("2024-01-21T23:59:59.999Z"),
      startOfView: dayjs("2024-01-15T00:00:00.000Z"),
      week: 3,
    },
    util: {
      decrementWeek: mock(),
      getLastNavigationSource: () => "manual",
      incrementWeek: mock(),
    },
  }) as unknown as WeekProps;

const EdgeNavigationGrid: FC<{ weekProps: WeekProps }> = ({ weekProps }) => {
  const renderCountRef = useRef(0);
  const mainGridRef = useRef<HTMLDivElement | null>(null);
  renderCountRef.current += 1;

  const edgeState = useDragEdgeNavigation(mainGridRef, weekProps);
  const attachMainGrid = useCallback((node: HTMLDivElement | null) => {
    if (!node || mainGridRef.current === node) return;

    node.getBoundingClientRect = () =>
      ({
        bottom: 600,
        height: 600,
        left: 0,
        right: 700,
        top: 0,
        width: 700,
        x: 0,
        y: 0,
      }) as DOMRect;

    mainGridRef.current = node;
  }, []);

  return (
    <>
      <div data-testid="main-grid" ref={attachMainGrid} />
      <output data-testid="edge">{edgeState.currentEdge ?? "none"}</output>
      <output data-testid="render-count">{renderCountRef.current}</output>
    </>
  );
};

const EdgeNavigationHarness: FC<{ weekProps: WeekProps }> = ({ weekProps }) => {
  const store = configureStore({
    reducer: reducers,
    preloadedState: createInitialState(),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });
  const interaction = new InteractionEngine();
  interaction.startDrag(timedDraft);

  return (
    <Provider store={store}>
      <SidebarDraftContext.Provider
        value={
          {
            actions: {},
            setters: {},
            state: { draft: null },
          } as never
        }
      >
        <DraftContext.Provider
          value={
            {
              actions: {},
              confirmation: {},
              interaction,
              setters: {},
              state: {
                dateBeingChanged: "endDate",
                draft: timedDraft,
                formProps: {},
                isFormOpen: false,
                isFormOpenBeforeDragging: null,
                isResizing: false,
              },
            } as never
          }
        >
          <EdgeNavigationGrid weekProps={weekProps} />
        </DraftContext.Provider>
      </SidebarDraftContext.Provider>
    </Provider>
  );
};

describe("useDragEdgeNavigation", () => {
  it("does not re-render for edge progress while waiting to navigate", async () => {
    const weekProps = createWeekProps();

    render(<EdgeNavigationHarness weekProps={weekProps} />);

    fireEvent.mouseMove(window, { clientX: 690, clientY: 200 });

    await waitFor(() =>
      expect(screen.getByTestId("edge").textContent).toBe("right"),
    );

    const renderCountAfterEdge = screen.getByTestId("render-count").textContent;

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(screen.getByTestId("render-count").textContent).toBe(
      renderCountAfterEdge,
    );
  });

  it("navigates after the pointer stays at the right edge", async () => {
    const weekProps = createWeekProps();

    render(<EdgeNavigationHarness weekProps={weekProps} />);

    fireEvent.mouseMove(window, { clientX: 690, clientY: 200 });

    await waitFor(
      () =>
        expect(weekProps.util.incrementWeek).toHaveBeenCalledWith(
          "drag-to-edge",
        ),
      { timeout: 800 },
    );
  });
});
