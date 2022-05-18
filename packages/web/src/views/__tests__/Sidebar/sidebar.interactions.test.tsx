import React from "react";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@web/common/__mocks__/server/mock.server";
import { feb27ToMar5Handlers } from "@web/common/__mocks__/server/mock.handlers";
import { render } from "@web/common/__mocks__/mock.render";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { CalendarView } from "@web/views/Calendar";
import { API_BASEURL } from "@web/common/constants/web.constants";

describe("Sidebar: Interactions", () => {
  beforeAll(() => {
    mockLocalStorage();
    mockScroll();
    server.listen();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    clearLocalStorageMock();
    server.close();
  });
  it("adds someday event to sidebar", async () => {
    server.use(feb27ToMar5Handlers);
    server.use(
      rest.post(`${API_BASEURL}/event`, (req, res, ctx) => {
        return res(
          ctx.json({
            _id: "awk92akknm",
            description: "",
            isSomeday: true,
            origin: "compass",
            priority: "unassigned",
            title: "Learn Chinese",
            user: "6279ae1f6df90e20e7a15ffd",
          })
        );
      })
    );

    const user = userEvent.setup();
    await waitFor(() => {
      render(<CalendarView />, { state: weekEventState });
    });

    const sidebar = screen.getByRole("complementary");

    await act(async () => {
      await user.click(
        within(sidebar).getByRole("button", { name: /add someday event/i })
      );
    });

    await act(async () => {
      await user.type(
        screen.getByRole("input", { name: /title/i }),
        "Learn Chinese"
      );
    });

    // TODO: shows preview while typing
    // expect(within(sidebar).getByDisplayValue("learn")).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(/save/i));
    });

    expect(
      within(sidebar).getByRole("button", { name: /^learn chinese$/i })
    ).toBeInTheDocument();
  });
  describe("Drag & Drop", () => {
    it.todo("moves event from sidebar to grid after drop");

    it.todo("displays times preview while dragging");
  });
});
