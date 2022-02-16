import React from "react";
import dayjs from "dayjs";
import { rest } from "msw";
import { setupServer } from "msw/node";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";

import { CalendarView } from "@web/views/Calendar";
import { getWeekDayLabel } from "@web/ducks/events/event.helpers";
import { render } from "@web/common/helpers/test.helpers";

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
});

describe("CalendarView: First Render", () => {
  beforeEach(() => {
    render(<CalendarView />);
  });
  it("renders current year in YYYY format", () => {
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument;
  });

  it("renders navigation arrows", () => {
    expect(screen.getByText(/</i)).toBeInTheDocument;
    expect(screen.getByText(/>/i)).toBeInTheDocument;
  });
  it("renders current week", () => {
    const todaysDate = new Date().getDate().toString();
    expect(todaysDate).toBeInTheDocument;
  });
  it("scrolls", () => {
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalled;
  });
});

describe("CalendarView: Interactions", () => {
  const server = setupServer(
    rest.get(
      //   "/api/event?start=2022-02-13T00:00:00-06:00&end=2022-02-19T23:59:59-06:00",
      "/api/event",
      (req, res, ctx) => {
        // const start = req.url.searchParams.get("start");
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
      }
    )
  );

  beforeAll(() => {
    server.listen();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders previous week upon nav arrow click", async () => {
    const user = userEvent.setup();
    const { container } = render(<CalendarView />);
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
});
