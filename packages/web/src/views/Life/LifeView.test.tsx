import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { viewActions } from "@web/events/stores/view.store";
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

async function renderLifeViewWithSidebar() {
  const result = renderLifeView();
  await waitFor(() => {
    expect(
      screen.getByRole("complementary", { name: "Sidebar" }),
    ).toBeInTheDocument();
  });
  return result;
}

const mockNavigate = mock();
// Bun's mock.module is process-wide and file order is non-deterministic.
// Gate every overridden hook so afterAll restores real useSearch — otherwise
// AuthModal (URL-driven via ?auth=) never opens for later files in the process.
const actualTanstackRouter = { ...(await import("@tanstack/react-router")) };
let isRouterMocked = true;
let mockedLifeSearch: Record<string, unknown> = {};

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
      : (actualTanstackRouter.useNavigate as (...a: unknown[]) => unknown)(
          ...args,
        ),
  useLocation: (...args: unknown[]) =>
    isRouterMocked
      ? { pathname: "/life" }
      : (actualTanstackRouter.useLocation as (...a: unknown[]) => unknown)(
          ...args,
        ),
  useSearch: (...args: unknown[]) =>
    isRouterMocked
      ? mockedLifeSearch
      : (actualTanstackRouter.useSearch as (...a: unknown[]) => unknown)(
          ...args,
        ),
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
      matches: query.includes("min-width")
        ? !isMobile
        : isMobile && query.includes("max-width"),
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
  mockedLifeSearch = {};
  mockNavigate.mockClear();
  localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, "true");
  viewActions.setSidebarOpen(true);
  mockViewport(false);
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEYS.LIFE_PREFERENCES);
  localStorage.removeItem(STORAGE_KEYS.SIDEBAR_OPEN);
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalInnerWidth,
    writable: true,
  });
  window.matchMedia = originalMatchMedia;
});

describe("LifeView", () => {
  it("renders the shared header, sidebar controls, grid, and no zoom UI", async () => {
    await renderLifeViewWithSidebar();

    expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Date of birth" })).toHaveValue(
      "Jan 1, 2000",
    );
    expect(
      screen.getByRole("textbox", { name: "Date of birth" }),
    ).toHaveFocus();
    // New users get the birth-date field focused, but the calendar stays closed
    // so the first impression stays on the life grid.
    expect(
      screen.queryByRole("button", { name: "Previous month" }),
    ).not.toBeInTheDocument();
    expect(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    ).toBe("77");
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(
      screen.getByText("This is your life if you live to 77"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Each dot represents one week of your life, and each row represents one year.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Share" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1,356 weeks lived - 26 years - 34%",
    );
    const region = screen.getByRole("region", {
      name: /life visualization/i,
    });
    expect(region).toBeInTheDocument();
    expect(region.querySelector(".ring-1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /zoom/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ctrl\+scroll|pinch/i)).not.toBeInTheDocument();
  });

  it("opens the birth date picker when Enter is pressed on the focused field", async () => {
    const user = userEvent.setup({ skipHover: true });
    await renderLifeViewWithSidebar();

    const birthDateInput = screen.getByRole("textbox", {
      name: "Date of birth",
    });
    expect(birthDateInput).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Previous month" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeInTheDocument();
  });

  it("updates weeks lived when the birth date changes", async () => {
    await renderLifeViewWithSidebar();

    fireEvent.change(screen.getByRole("textbox", { name: "Date of birth" }), {
      target: { value: "1990-06-15" },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "1,854 weeks lived - 35 years - 46%",
    );
    expect(
      screen
        .getByRole("region", { name: /life visualization/i })
        .querySelector(".ring-1"),
    ).toBeInTheDocument();
  });

  it("updates the grid size when the lifespan changes", async () => {
    await renderLifeViewWithSidebar();

    const region = screen.getByRole("region", {
      name: /life visualization/i,
    });
    expect(getGrid(region).dataset.totalDots).toBe(String(77 * 52));

    fireEvent.change(screen.getByLabelText(/age of death/i), {
      target: { value: "85" },
    });

    expect(getGrid(region).dataset.totalDots).toBe(String(85 * 52));
  });

  it("persists the user's life preferences", async () => {
    await renderLifeViewWithSidebar();

    fireEvent.change(screen.getByRole("textbox", { name: "Date of birth" }), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/age of death/i), {
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

  it("reads persisted preferences and ignores corrupt storage", async () => {
    localStorage.setItem(
      STORAGE_KEYS.LIFE_PREFERENCES,
      JSON.stringify({ birthDate: "2000-01-01", lifespan: 81 }),
    );
    const { unmount } = await renderLifeViewWithSidebar();

    expect(screen.getByRole("textbox", { name: "Date of birth" })).toHaveValue(
      "Jan 1, 2000",
    );
    expect(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    ).toBe("81");
    unmount();

    localStorage.setItem(STORAGE_KEYS.LIFE_PREFERENCES, "{");
    await renderLifeViewWithSidebar();

    expect(
      (
        screen.getByRole("textbox", {
          name: "Date of birth",
        }) as HTMLInputElement
      ).value,
    ).toBe("Jan 1, 2000");
    expect(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    ).toBe("77");
  });

  it("allows the age input to be cleared before entering a new age", async () => {
    const user = userEvent.setup();
    await renderLifeViewWithSidebar();

    const ageInput = screen.getByLabelText(/age of death/i);
    await user.clear(ageInput);
    expect((ageInput as HTMLInputElement).value).toBe("");

    await user.type(ageInput, "88");
    expect((ageInput as HTMLInputElement).value).toBe("88");
    expect(
      getGrid(screen.getByRole("region", { name: /life visualization/i })),
    ).toHaveAttribute("data-total-dots", String(88 * 52));
  });

  it("cycles life variations with arrows and resets their default ages", async () => {
    const user = userEvent.setup();
    await renderLifeViewWithSidebar();

    await user.click(
      screen.getByRole("button", { name: "Next life variation" }),
    );

    expect(screen.getByText("Long")).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    ).toBe("100");

    await user.click(
      screen.getByRole("button", { name: "Next life variation" }),
    );
    expect(screen.getByText("Random")).toBeInTheDocument();
    const randomAge = Number(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    );
    expect(randomAge).toBeGreaterThanOrEqual(1);
    expect(randomAge).toBeLessThanOrEqual(100);
  });

  it("cycles life variations with J and K", async () => {
    await renderLifeViewWithSidebar();

    fireEvent.keyUp(document, { key: "k" });
    expect(screen.getByText("Long")).toBeInTheDocument();
    expect(
      screen.getByText("This is your life if you live to 100"),
    ).toBeInTheDocument();

    fireEvent.keyUp(document, { key: "j" });
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(
      screen.getByText("This is your life if you live to 77"),
    ).toBeInTheDocument();
  });

  it("restores a bookmarkable Life variation", async () => {
    mockedLifeSearch = { age: 100, variation: "long" };
    await renderLifeViewWithSidebar();

    expect(screen.getByText("Long")).toBeInTheDocument();
    expect(
      screen.getByText("This is your life if you live to 100"),
    ).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    ).toBe("100");
  });

  it("shuffles to a random Life variation", async () => {
    const user = userEvent.setup();
    await renderLifeViewWithSidebar();

    await user.click(
      screen.getByRole("button", { name: "Shuffle life variation" }),
    );

    expect(screen.getByText("Random")).toBeInTheDocument();
    const lifespan = Number(
      (screen.getByLabelText(/age of death/i) as HTMLInputElement).value,
    );
    expect(lifespan).toBeGreaterThanOrEqual(1);
    expect(lifespan).toBeLessThanOrEqual(100);
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
    expect(region).toHaveClass("overflow-auto");
    expect(
      screen.queryByRole("button", { name: /zoom/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the privacy tooltip on the date of birth label", async () => {
    const user = userEvent.setup();
    await renderLifeViewWithSidebar();

    await user.hover(screen.getByText("Date of birth"));
    expect(
      await screen.findByText("We don't store this information"),
    ).toBeInTheDocument();
  });

  it("focuses the current week when the today shortcut is pressed", async () => {
    await renderLifeViewWithSidebar();

    fireEvent.change(screen.getByRole("textbox", { name: "Date of birth" }), {
      target: { value: "1990-06-15" },
    });

    const currentWeek = screen.getByRole("button", {
      name: /January 1, 2026 \| week/,
    });
    fireEvent.keyUp(document, { key: "t" });

    expect(currentWeek).toHaveFocus();
  });
});
