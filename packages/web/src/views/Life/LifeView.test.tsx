import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { LifeView } from "./LifeView";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const fixedToday = new Date(2026, 0, 1);
const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

function renderLifeView() {
  return render(<LifeView today={fixedToday} />);
}

const mockNavigate = mock();
const actualTanstackRouter = { ...(await import("@tanstack/react-router")) };
let isRouterMocked = true;

mock.module("@tanstack/react-router", () => ({
  ...actualTanstackRouter,
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: (...args: unknown[]) =>
    isRouterMocked
      ? mockNavigate
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of this suite.
        actualTanstackRouter.useNavigate(...(args as [])),
}));

afterAll(() => {
  isRouterMocked = false;
});

function mockViewport(isMobile: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: isMobile ? 375 : 1024,
    writable: true,
  });
  window.matchMedia = ((query: string) =>
    ({
      matches: isMobile && query.includes("max-width"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }) as MediaQueryList) as typeof window.matchMedia;
}

function getGrid(region: HTMLElement) {
  return region.querySelector("[data-total-dots]") as HTMLElement;
}

beforeEach(() => {
  mockViewport(false);
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEYS.LIFE_PREFERENCES);
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalInnerWidth,
    writable: true,
  });
  window.matchMedia = originalMatchMedia;
});

describe("LifeView", () => {
  it("renders the native controls, status, grid, and no zoom UI", () => {
    renderLifeView();

    expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("");
    expect(screen.getByLabelText(/through age/i)).toHaveValue(79);
    expect(screen.getByRole("status")).toHaveTextContent("Birth date not set");
    const region = screen.getByRole("region", {
      name: /life visualization/i,
    });
    expect(region).toBeInTheDocument();
    expect(region.querySelector(".ring-1")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /zoom/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ctrl\+scroll|pinch/i)).not.toBeInTheDocument();
  });

  it("updates weeks lived when the birth date changes", async () => {
    renderLifeView();

    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: "1990-06-15" },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "1,854 weeks lived - 35 years - 45%",
    );
    expect(
      screen
        .getByRole("region", { name: /life visualization/i })
        .querySelector(".ring-1"),
    ).toBeInTheDocument();
  });

  it("updates the grid size when the lifespan changes", () => {
    renderLifeView();

    const region = screen.getByRole("region", {
      name: /life visualization/i,
    });
    expect(getGrid(region).dataset.totalDots).toBe(String(79 * 52));

    fireEvent.change(screen.getByLabelText(/through age/i), {
      target: { value: "85" },
    });

    expect(getGrid(region).dataset.totalDots).toBe(String(85 * 52));
  });

  it("persists the user's life preferences", async () => {
    renderLifeView();

    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/through age/i), {
      target: { value: "81" },
    });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.LIFE_PREFERENCES)).toContain(
        '"birthDate":"2000-01-01"',
      );
      expect(localStorage.getItem(STORAGE_KEYS.LIFE_PREFERENCES)).toContain(
        '"lifespan":81',
      );
    });
  });

  it("reads persisted preferences and ignores corrupt storage", () => {
    localStorage.setItem(
      STORAGE_KEYS.LIFE_PREFERENCES,
      JSON.stringify({ birthDate: "2000-01-01", lifespan: 81 }),
    );
    const { unmount } = renderLifeView();

    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("2000-01-01");
    expect(screen.getByLabelText(/through age/i)).toHaveValue(81);
    unmount();

    localStorage.setItem(STORAGE_KEYS.LIFE_PREFERENCES, "{");
    renderLifeView();

    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("");
    expect(screen.getByLabelText(/through age/i)).toHaveValue(79);
  });

  it("keeps the 52-week row on mobile without horizontal scroll or dot buttons", () => {
    mockViewport(true);
    renderLifeView();

    const region = screen.getByRole("region", {
      name: /life visualization/i,
    });
    const firstWeekRow = getGrid(region).querySelector(
      "div[style]",
    ) as HTMLElement;

    expect(firstWeekRow.style.gridTemplateColumns).toContain("repeat(52,");
    expect(region).toHaveClass("overflow-x-hidden");
    expect(screen.queryAllByRole("button")).toHaveLength(1);
  });

  it("opens the about dialog with the blog link", async () => {
    const user = userEvent.setup();
    renderLifeView();

    await user.click(screen.getByRole("button", { name: /information/i }));

    const dialog = await screen.findByRole("dialog", {
      name: /about life in weeks/i,
    });
    const link = within(dialog).getByRole("link", {
      name: /visualize your life in weeks/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "/blog/visualize-your-life-in-weeks?utm_source=website&utm_medium=life_in_weeks_dialog&utm_campaign=blog_link",
    );
  });
});
