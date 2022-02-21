import React, { useRef } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/helpers/test.helpers";
import { weekEventState } from "@web/common/__mocks__/state.weekEvents";
import { useGetWeekViewProps } from "../weekViewHooks/useGetWeekViewProps";

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

  it("navigation arrows", async () => {
    expect(screen.getByText(/</i)).toBeInTheDocument;
    expect(screen.getByText(/>/i)).toBeInTheDocument;
  });
  it("current week", () => {
    const todaysDate = new Date().getDate().toString();
    expect(todaysDate).toBeInTheDocument;
  });
  it("automatically scrolls", () => {
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
  });
});

describe("CalendarView: Renders with State", () => {
  beforeEach(() => {
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    render(<CalendarView />, { preloadedState });
  });

  it("timed and all day event", () => {
    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });

  describe("Event cell widths", () => {
    it("makes todays width the longest", () => {
      const allDayEvent = screen.getByRole("button", {
        name: /chill all day/i,
      });
      // setup
      jest.mock("react", () => {
        const originReact = jest.requireActual("react");
        const mUseRef = jest.fn();
        return {
          ...originReact,
          useRef: mUseRef,
        };
      });
      // setup this test
      const mRef = { current: { offsetWidth: 100 } };
      useRef.mockReturnValueOnce(mRef);
    });
  });

  /*
  // ... this dont work cuz its mocking the thing you
      // need to test (clientWidth) -- oops
      const origWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "clientWidth"
      );
      Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        value: 500,
      });
      const chillBtn = screen.getByRole("button", { name: /chill all day/i });
      const yy = chillBtn.clientWidth; // 0 by default cuz jsdom
      const x = "";
      Object.defineProperty(HTMLElement.prototype, "clientWidth", origWidth);
  */
});

jest.mock("react", () => {
  return {
    ...jest.requireActual("react"),
    useRef: jest.fn(),
  };
});

const useMockRef = jest.mocked(useRef);

describe("66332902", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.resetAllMocks();
  });
  test("wip mock stuff", () => {
    const ref = { current: {} };
    Object.defineProperty(ref, "current", {
      set(_current) {
        if (_current) {
          jest
            .spyOn(_current, "weekDaysRef", "get")
            .mockReturnValueOnce({ foo: "bar" });
        }
        this._current = _current;
      },
      get() {
        return this._current;
      },
    });
    useMockRef.mockReturnValueOnce(ref);
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    render(<CalendarView />, { preloadedState });
    // render(<App />);
  });
});
