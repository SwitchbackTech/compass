import { SyntheticEvent, act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLIMB, EUROPE_TRIP } from "@core/__mocks__/v1/events/events.misc";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { findAndUpdateEventInPreloadedState } from "@web/__tests__/utils/state/store.test.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { CalendarView } from "@web/views/Calendar";
import { AuthenticatedLayout } from "../../components/AuthenticatedLayout/AuthenticatedLayout";
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

function Component() {
  return (
    <>
      <AuthenticatedLayout />
      <CalendarView />
    </>
  );
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
  it("closes after clicking trash icon", async () => {
    mockConfirm.mockReturnValue(true);

    const user = userEvent.setup();

    await act(() =>
      render(<></>, {
        router,
        state: findAndUpdateEventInPreloadedState(
          preloadedState,
          EUROPE_TRIP._id as string,
          freshenEventStartEndDate,
        ),
      }),
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Europe Trip < >" }));
    });

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
    await act(async () => {
      await user.click(screen.getByText("Delete"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);
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

  describe("Reminder", () => {
    it("it should be focused when the 'r' keyboard shortcut is used", async () => {
      const { container } = await act(() =>
        render(<></>, { router, state: preloadedState }),
      );

      const reminderPlaceholder = screen.getByText(
        "Click to add your reminder",
      );

      expect(reminderPlaceholder).toBeInTheDocument();

      await act(async () => userEvent.keyboard("r"));

      const reminderInput = container.querySelector('[id="reminderInput"]');

      expect(reminderInput).toHaveFocus();
    });

    it("it should be focused when the 'edit reminder' btn is clicked in the command palette", async () => {
      const user = userEvent.setup();

      await act(() => render(<></>, { router, state: preloadedState }));

      expect(
        screen.getByText("Click to add your reminder"),
      ).toBeInTheDocument();

      await act(async () => {
        await user.keyboard(`{${getModifierKey()}>}k{/${getModifierKey()}}`);
      });

      const cmdPaletteEditBtn = await screen.findByRole("button", {
        name: /edit reminder/i,
      });
      await act(async () => {
        await user.click(cmdPaletteEditBtn);
      });

      await waitFor(() => {
        const input = document.querySelector("#reminderInput");
        expect(input).toBeInTheDocument();
        expect(input).toHaveFocus();
      });
    }, 10000);
  });
});
