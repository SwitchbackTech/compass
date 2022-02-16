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

describe("CalendarView: Renders", () => {
  beforeEach(() => {
    render(<CalendarView />);
  });
  it("current year in YYYY format", () => {
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument;
  });

  it("navigation arrows", () => {
    expect(screen.getByText(/</i)).toBeInTheDocument;
    expect(screen.getByText(/>/i)).toBeInTheDocument;
  });
  it("current week", () => {
    const todaysDate = new Date().getDate().toString();
    expect(todaysDate).toBeInTheDocument;
  });
  it("automatically scrolls", () => {
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalled;
  });
  it("timed and all day event", () => {
    const preloadedState = {
      events: {
        getWeekEvents: {
          value: {
            data: ["620c177bfadfdec705cdd70a", "620c177bfadfdec705cdd69c"],
          },
        },
        entities: {
          value: {
            "620c177bfadfdec705cdd70a": {
              _id: "620c177bfadfdec705cdd70a",
              gEventId: "pihjll1k75s1g9019ru6tkb97c",
              user: "61f2f0704d0ee49134c7a01d",
              origin: "googleimport",
              title: "groceries",
              description: "foo",
              priorities: [],
              isAllDay: false,
              startDate: "2022-02-14T11:45:00-06:00",
              endDate: "2022-02-14T12:45:00-06:00",
              priority: "relations",
            },
            "620c177bfadfdec705cdd69c": {
              _id: "620c177bfadfdec705cdd69c",
              gEventId:
                "6csjad336cs3ibb469imcb9kc9gj6bb26ss30bb56kojgoj464o66ohh60",
              user: "61f2f0704d0ee49134c7a01d",
              origin: "googleimport",
              title: "chill all day",
              description: "just chillin",
              priorities: [],
              isAllDay: true,
              startDate: "2022-02-16",
              endDate: "2022-02-17",
              priority: "relations",
            },
          },
        },
      },
    };
    render(<CalendarView />, { preloadedState });
    expect(screen.getByText("groceries")).toBeInTheDocument();
    expect(screen.getByText("chill all day")).toBeInTheDocument();
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

  it("navigates to previous week upon nav arrow click", async () => {
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
