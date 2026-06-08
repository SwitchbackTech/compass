import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LifeView } from "./LifeView";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const fixedToday = new Date(2026, 0, 1);
const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

function renderLifeView() {
  return render(<LifeView enableDotTooltips={false} today={fixedToday} />);
}

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
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalInnerWidth,
    writable: true,
  });
  window.matchMedia = originalMatchMedia;
});

describe("LifeView", () => {
  it("renders default controls, status, grid, and zoom instructions", () => {
    renderLifeView();

    expect(
      screen.getByRole("heading", { name: /my life in weeks/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/birth year/i)).toHaveValue("2000");
    expect(screen.getByLabelText(/birth month/i)).toHaveValue("1");
    expect(screen.getByLabelText(/birth day/i)).toHaveValue("1");
    expect(screen.getByLabelText(/death age/i)).toHaveValue("79");
    expect(screen.getByRole("status")).toHaveTextContent(
      "You've lived 1356 weeks (26 years)",
    );
    expect(
      screen.getByRole("region", { name: /life in weeks visualization/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/or use buttons to zoom/i)).toBeInTheDocument();
  });

  it("updates weeks lived when the birth date changes", async () => {
    const user = userEvent.setup();
    renderLifeView();

    await user.selectOptions(screen.getByLabelText(/birth year/i), "1990");
    await user.selectOptions(screen.getByLabelText(/birth month/i), "6");
    await user.selectOptions(screen.getByLabelText(/birth day/i), "15");

    expect(screen.getByRole("status")).toHaveTextContent(
      "You've lived 1854 weeks (35 years)",
    );
  });

  it("updates the grid size when the death age changes", async () => {
    const user = userEvent.setup();
    renderLifeView();

    const region = screen.getByRole("region", {
      name: /life in weeks visualization/i,
    });
    expect(getGrid(region).dataset.totalDots).toBe(String(79 * 52));

    await user.selectOptions(screen.getByLabelText(/death age/i), "85");

    expect(getGrid(region).dataset.totalDots).toBe(String(85 * 52));
  });

  it("zooms with buttons and disables zoom out at the minimum", async () => {
    const user = userEvent.setup();
    renderLifeView();

    expect(screen.getByText("100%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(screen.getByText("120%")).toBeInTheDocument();

    const zoomOut = screen.getByRole("button", { name: /zoom out/i });
    await user.click(zoomOut);
    await user.click(zoomOut);
    await user.click(zoomOut);
    await user.click(zoomOut);

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(zoomOut).toBeDisabled();
  });

  it("allows desktop scrolling when zoomed beyond the fit scale", async () => {
    const user = userEvent.setup();
    renderLifeView();

    const region = screen.getByRole("region", {
      name: /life in weeks visualization/i,
    });
    expect(region).toHaveClass("overflow-hidden");

    await user.click(screen.getByRole("button", { name: /zoom in/i }));

    await waitFor(() => expect(region).toHaveClass("overflow-auto"));
  });

  it("reflows columns on mobile when zoomed while keeping overflow hidden", async () => {
    const user = userEvent.setup();
    mockViewport(true);
    renderLifeView();

    const region = screen.getByRole("region", {
      name: /life in weeks visualization/i,
    });
    const grid = getGrid(region);
    expect(grid.style.gridTemplateColumns).toContain("repeat(52,");

    await user.click(screen.getByRole("button", { name: /zoom in/i }));

    expect(grid.style.gridTemplateColumns).toContain("repeat(43,");
    expect(region).toHaveClass("overflow-hidden");
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
