import { type ReactNode } from "react";
import { createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, mock, spyOn, vi } from "bun:test";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";

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
const { CalendarView } =
  require("@web/views/Calendar") as typeof import("@web/views/Calendar");

const mockBaseApiAdapter = mock(async ({ url }) => {
  return {
    config: { method: "GET", url },
    data: url.startsWith("/event") ? [] : {},
    headers: new Headers(),
    status: 200,
    statusText: "OK",
  };
});

const router = createMemoryRouter([{ index: true, Component: CalendarView }], {
  initialEntries: ["/"],
});

beforeEach(() => {
  BaseApi.defaults.adapter = mockBaseApiAdapter;
  mockBaseApiAdapter.mockClear();
  vi.clearAllMocks();
});

describe("Scroll", () => {
  // separate from other tests to preserve
  // '.toHaveBeenCalledTimes' reliability
  it("only scrolls once", async () => {
    const scrollSpy = spyOn(window.HTMLElement.prototype, "scroll");

    render(<></>, { router });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Calendar: Display without State", () => {
  it("displays all the things that a user needs to see", async () => {
    render(<></>, { router });

    /* week nav arrows */
    expect(
      screen.getByRole("navigation", {
        name: /previous week/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: /next week/i,
      }),
    ).toBeInTheDocument();

    /* current week label */
    const todayLabel = getWeekDayLabel(new Date());
    expect(screen.getByTitle(todayLabel)).toBeInTheDocument();

    /* now line */
    expect(
      screen.getByRole("separator", { name: /now line/i }),
    ).toBeInTheDocument();
  });
});
