import React from "react";
import dayjs from "dayjs";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { CalendarView } from "@web/views/Calendar";
import { CompassRoot } from "@web/routers/index";
import { getWeekDayLabel } from "@web/ducks/events/event.helpers";
import { render } from "@web/common/__mocks__/mock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/helpers/test.util";
describe("CalendarView: Interactions", () => {
  const server = setupServer(
    rest.get("/api/event", (req, res, ctx) => {
      const events = [
        {
          _id: "620c177bfadfdec705cdd6a6",
          gEventId: "6qnjpveml3kol7q9tdqaklh1mb",
          user: "61f2f0704d0ee49134c7a01d",
          origin: "googleimport",
          title: "groceries",
          description: "some details",
          priorities: [],
          isAllDay: false,
          startDate: "2022-02-15T17:00:00-06:00",
          endDate: "2022-02-15T18:00:00-06:00",
          priority: "relations",
        },
      ];
      return res(ctx.json(events));
    })
  );

  beforeAll(() => {
    window.HTMLElement.prototype.scroll = jest.fn();
    mockLocalStorage();
    localStorage.setItem("token", "mytoken123");
    server.listen();
  });
  afterEach(() => server.resetHandlers());

  afterAll(() => {
    clearLocalStorageMock();
    server.close();
  });

  it("navigates to previous week upon nav arrow click", async () => {
    const user = userEvent.setup();
    const { container } = render(CompassRoot);
    const todayId = "#id-" + getWeekDayLabel(dayjs());

    expect(container.querySelector(todayId)).not.toBe(null);
    await user.click(screen.getByText(/</i));
    expect(container.querySelector(todayId)).toBe(null);
  });

  it("renders today only when on different week than current", async () => {
    const user = userEvent.setup();
    render(<CalendarView />);

    expect(screen.queryByText(/today/i)).not.toBeInTheDocument();
    await user.click(screen.getByText(/</i));
    expect(screen.getByText(/today/i)).toBeInTheDocument();

    // user returns to original week
    await user.click(screen.getByText(/>/i));
    expect(screen.queryByText(/today/i)).not.toBeInTheDocument();

    await user.click(screen.getByText(/>/i));
    expect(screen.queryByText(/today/i)).toBeInTheDocument();
  });
});

/* 
  Finish this once adding better error-handling
    - Difficult to mock `alert`, so not worth spending time on it,
    since we'll have a more robust way of handling errors anyway
    - Consider using redux, similar to this example:
        https://testing-library.com/docs/react-testing-library/example-intro/#system-under-test
    

  it("sends alert upon server error", async () => {
    server.use(
      rest.get("/api/event", (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            errorMessage: `sth bad happened`,
          })
        );
      })
    );
    // expect(screen.getByRole("alert")).toBeInTheDocument;
    // ...
  });
  */
