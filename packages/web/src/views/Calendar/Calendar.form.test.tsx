import { SyntheticEvent, act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLIMB, EUROPE_TRIP } from "@core/__mocks__/v1/events/events.misc";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import {
  InitialReduxState,
  findAndUpdateEventInPreloadedState,
} from "@web/__tests__/utils/state/store.test.util";
import { RootState } from "@web/store";
import { CalendarView } from "@web/views/Calendar";
import { freshenEventStartEndDate } from "./calendar.render.test.utils";

// Mock IntersectionObserver for jsdom
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = "";
  thresholds: ReadonlyArray<number> = [];
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    void callback;
    void options;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as typeof IntersectionObserver;

jest.mock("@web/views/Calendar/hooks/mouse/useEventListener", () => ({
  useEventListener: jest.fn(),
}));

jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility:
    (callback: () => void, visible = false) =>
    (event: SyntheticEvent<Element, Event>) => {
      void visible;
      void event;
      callback();
    },
}));

jest.mock("@web/auth/auth.util", () => ({
  getUserId: async () => "test-user-id",
}));

function Component() {
  return <CalendarView />;
}

const router = createMemoryRouter([{ index: true, Component }], {
  initialEntries: ["/"],
});

const mockConfirm = jest.spyOn(window, "confirm");

describe("Event Form", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("closes after clicking outside", async () => {
    await act(() => render(<></>, { router, state: preloadedState }));

    const user = userEvent.setup();

    await act(async () => {
      const climbBtn = document.querySelector(
        `[data-event-id="${CLIMB._id}"]`,
      ) as HTMLElement;
      await user.click(climbBtn);
    });

    await act(async () => {
      await user.click(document.body);
    });

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  describe("DatePicker", () => {
    it("does not open dialog by default", async () => {
      const user = userEvent.setup();

      const { container } = await act(() =>
        render(<></>, { router, state: preloadedState }),
      );

      await act(async () => {
        const climbBtn = document.querySelector(
          `[data-event-id="${CLIMB._id}"]`,
        ) as HTMLElement;
        await user.click(climbBtn);
      });

      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0,
      );
    });
  });
});
