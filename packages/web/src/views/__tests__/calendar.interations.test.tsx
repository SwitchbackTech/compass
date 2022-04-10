import React from "react";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { CalendarView } from "@web/views/Calendar";
import { CompassRoot } from "@web/routers/index";
import { render } from "@web/common/__mocks__/mock.render";
import { febToMarState } from "@web/common/__mocks__/state/state.0227To0305";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
describe("Calendar Interactions", () => {
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

  describe("Navigation Arrow Row", () => {
    it("navigates to previous week upon nav arrow click", async () => {
      const user = userEvent.setup();
      render(CompassRoot);

      expect(screen.queryByText(/today/i)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /previous week/i }));
      expect(screen.getByText(/today/i)).toBeInTheDocument();
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
      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });
  });

  describe("Event Form", () => {
    it("opens upon click all-day event click (and not before)", async () => {
      /*
      note: this doesn't test if an event is effectively 'hidden' from a user 
      because the row logic was incorrect and allowed overlapping events. 
        - the event may be on the DOM and clickable by testing-library,
          but if a user tried clicking in that spot, she would only 
          be able to click the event that's on the 'top' layer
      */
      const user = userEvent.setup();
      const preloadedState = febToMarState; // has to be called 'preloadedState' to render correctly
      render(<CalendarView />, { preloadedState });

      // just testing a handful of events to minimize slowness
      const titles = [
        // all-day events
        "multiweek event",
        "Mar 1",
        // regular events
        "Ty & Tim",
      ];

      for (const t of titles) {
        expect(screen.queryByDisplayValue(t)).not.toBeInTheDocument(); // shouldnt show form before being clicked
        await user.click(screen.getByRole("button", { name: t }));
        await waitFor(() => {
          expect(screen.getByDisplayValue(t)).toBeInTheDocument();
        });
        /*
        TODO: escape +/ click out of even and confirm form disappears
        opt: 
          user.keyboard ...
        opt (wasnt working initiall):
          fireEvent.keyDown(screen.getByText(/today/i), {
            key: "Escape",
            code: "Escape",
            charCode: 27,
          });

        expect(screen.queryByDisplayValue(t)).not.toBeInTheDocument(); // shouldnt show form before being clicked
        */
      }
    });

    it("closes when clicking page heading", async () => {
      const user = userEvent.setup();
      const preloadedState = febToMarState; // has to be called 'preloadedState' to render correctly
      render(<CalendarView />, { preloadedState });

      await user.click(screen.getByRole("button", { name: "Mar 1" }));
      await user.click(screen.getByRole("heading", { level: 1 }));

      await waitFor(() => {
        expect(
          screen.queryByRole("form", { name: /event form/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("All Day Events", () => {
    it("adds 1-day event somewhere on DOM", async () => {
      const user = userEvent.setup();
      const preloadedState = febToMarState; // has to be called 'preloadedState' to render correctly
      const { container } = render(<CalendarView />, { preloadedState });

      await user.click(container.querySelector("#allDayGrid"));
      await waitFor(() => {
        expect(
          screen.getByRole("form", {
            name: /event form/i,
          })
        ).toBeInTheDocument();
      });
      await user.type(screen.getByPlaceholderText(/title/i), "Hello, World");
      await userEvent.keyboard("{Enter}");

      // TODO: update test to ensure its on the expected day column
      expect(screen.getByDisplayValue("Hello, World")).toBeInTheDocument();
    });
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
