import { type ReactNode } from "react";
import { createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, mock, spyOn, vi } from "bun:test";
import { afterAll } from "bun:test";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";

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
  const isEventRequest = url.startsWith("/event");
  return {
    config: { method: "GET", url },
    data: isEventRequest ? [] : {},
    headers: new Headers(),
    status: 200,
    statusText: "OK",
  };
});

const router = createMemoryRouter([{ index: true, Component: CalendarView }], {
  initialEntries: ["/"],
});

describe("Calendar Interactions", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = mockBaseApiAdapter;
    mockBaseApiAdapter.mockClear();
    vi.clearAllMocks();
  });

  describe("Fetch Events", () => {
    it("displays alert upon server error", async () => {
      mockBaseApiAdapter.mockImplementationOnce(async ({ url }) => {
        return {
          config: { method: "GET", url },
          data: url.startsWith("/event") ? { error: "something broke" } : {},
          headers: new Headers(),
          status: url.startsWith("/event") ? 500 : 200,
          statusText: url.startsWith("/event")
            ? "Internal Server Error"
            : "OK",
        };
      });

      const alertMock = spyOn(globalThis, "alert").mockImplementation();

      render(<></>, { router });

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });
    });
  });

  describe("Now Line", () => {
    it("appears/disappears when viewing future or past week", async () => {
      const user = userEvent.setup();

      render(<></>, { router });

      // Check current week
      const nowLine = screen.queryByRole("separator", { name: /now line/i });
      expect(nowLine).toBeInTheDocument();

      // Check future week
      await user.click(
        screen.getByRole("navigation", {
          name: /next week/i,
        }),
      );

      expect(nowLine).not.toBeInTheDocument();
    });
  });
});

afterAll(() => {
  mock.restore();
});
