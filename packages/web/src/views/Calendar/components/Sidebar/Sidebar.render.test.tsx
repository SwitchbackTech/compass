import { type PropsWithChildren, type ReactNode } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
  spyOn,
  vi,
} from "bun:test";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { DraftProvider } from "@web/views/Calendar/components/Draft/context/DraftProvider";
import { SidebarDraftProvider } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftProvider";
import { type DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { type Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

mock.module("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    currentVersion: "test",
    isUpdateAvailable: false,
  }),
}));

const { BaseApi } =
  require("@web/common/apis/base/base.api") as typeof import("@web/common/apis/base/base.api");
const { Sidebar } =
  require("./Sidebar") as typeof import("./Sidebar");

const mockBaseApiAdapter = mock(async ({ url }) => {
  return {
    config: { method: "GET", url },
    data: url.startsWith("/event") ? [] : {},
    headers: new Headers(),
    status: 200,
    statusText: "OK",
  };
});

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
      setStartOfView: mock(),
    },
    util: {
      decrementWeek: mock(),
      incrementWeek: mock(),
      goToToday: mock(),
      getLastNavigationSource: mock(() => "manual"),
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
  window.HTMLElement.prototype.scroll = mock();
  setSystemTime(new Date("2025-12-10"));
});

beforeEach(() => {
  BaseApi.defaults.adapter = mockBaseApiAdapter;
  mockBaseApiAdapter.mockClear();
  vi.clearAllMocks();
});

afterAll(() => {
  setSystemTime();
});

describe("Sidebar: Display without State", () => {
  it("renders sidebar with sections and icons when no events exist", () => {
    render(<Sidebar {...mockProps} />, {
      state: {},
      wrapper: SidebarTestProviders,
    });

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
    render(<Sidebar {...mockProps} />, {
      state: preloadedState,
      wrapper: SidebarTestProviders,
    });

    await waitFor(() => {
      expect(
        within(screen.getByRole("complementary")).getByRole("button", {
          name: /^europe trip /i,
        }),
      ).toBeInTheDocument();
    });
  });
});
