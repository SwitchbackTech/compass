import { act } from "react";
import type { PropsWithChildren } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { DraftProvider } from "@web/views/Calendar/components/Draft/context/DraftProvider";
import { SidebarDraftProvider } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftProvider";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { Sidebar } from "./Sidebar";

const mockProps = {
  dateCalcs: {} as DateCalcs,
  measurements: {} as Measurements_Grid,
  weekProps: {
    component: {
      startOfView: dayjs("2025-12-07"),
      endOfView: dayjs("2025-12-13"),
      isCurrentWeek: true,
    },
    state: {
      setStartOfView: jest.fn(),
    },
    util: {
      decrementWeek: jest.fn(),
      incrementWeek: jest.fn(),
      goToToday: jest.fn(),
      getLastNavigationSource: jest.fn(() => "manual"),
    },
  } as any,
  gridRefs: {
    mainGridRef: { current: null },
  } as any,
};

const SidebarTestProviders = ({ children }: PropsWithChildren) => (
  <DraftProvider
    dateCalcs={mockProps.dateCalcs}
    weekProps={mockProps.weekProps}
    isSidebarOpen={true}
  >
    <SidebarDraftProvider
      dateCalcs={mockProps.dateCalcs}
      weekProps={mockProps.weekProps}
    >
      {children}
    </SidebarDraftProvider>
  </DraftProvider>
);

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2025-12-10"));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("Sidebar: Display without State", () => {
  it("renders sidebar with sections and icons when no events exist", async () => {
    await act(() =>
      render(<Sidebar {...mockProps} />, {
        state: {},
        wrapper: SidebarTestProviders,
      }),
    );

    expect(
      screen.getByRole("heading", { name: /this week/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /this month/i }),
    ).toBeInTheDocument();

    const addButtons = screen.getAllByRole("button", { name: "+" });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByRole("separator", { name: /sidebar divider/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });
});

describe("Sidebar: Display with State", () => {
  it("displays pre-existing someday event", async () => {
    await act(() =>
      render(<Sidebar {...mockProps} />, {
        state: preloadedState,
        wrapper: SidebarTestProviders,
      }),
    );

    await waitFor(() => {
      expect(
        within(screen.getByRole("complementary")).getByRole("button", {
          name: /^europe trip /i,
        }),
      ).toBeInTheDocument();
    });
  });
});
