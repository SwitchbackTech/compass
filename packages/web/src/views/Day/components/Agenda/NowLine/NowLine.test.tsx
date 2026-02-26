import { act } from "react";
import { render, screen } from "@testing-library/react";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import {
  getAgendaEventTime,
  getNowLinePosition,
} from "@web/views/Day/util/agenda/agenda.util";
import { setupMinuteSync } from "@web/views/Day/util/time/time.util";

// Mock dependencies
jest.mock("@web/common/utils/dom/grid-organization.util", () => {
  const { BehaviorSubject } = require("rxjs");
  return {
    maxAgendaZIndex$: new BehaviorSubject(10),
    maxGridZIndex$: new BehaviorSubject(10),
  };
});
jest.mock("@web/views/Day/util/agenda/agenda.util");
jest.mock("@web/views/Day/util/time/time.util");

describe("NowLine", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getNowLinePosition as jest.Mock).mockReturnValue(100);
    (getAgendaEventTime as jest.Mock).mockReturnValue("10:00 AM");
    (setupMinuteSync as jest.Mock).mockImplementation(() => {
      return jest.fn();
    });
  });

  it("renders correctly", () => {
    render(<NowLine />);

    const nowLine = screen.getByText("10:00 AM");
    expect(nowLine).toBeInTheDocument();
  });

  it("sets the correct position style", () => {
    const { container } = render(<NowLine />);

    // The main div has data-now-marker="true"
    const nowLineElement = container.querySelector('[data-now-marker="true"]');
    expect(nowLineElement).toHaveStyle({ top: "100px" });
  });

  it("updates time on minute sync", () => {
    let syncCallback: () => void;
    (setupMinuteSync as jest.Mock).mockImplementation((cb) => {
      syncCallback = cb;
      return jest.fn();
    });

    render(<NowLine />);

    // Initial render
    expect(getNowLinePosition).toHaveBeenCalledTimes(1);

    // Simulate minute sync
    act(() => {
      if (syncCallback) {
        syncCallback();
      }
    });

    // Should have updated state and re-rendered
    expect(getNowLinePosition).toHaveBeenCalledTimes(2);
  });

  it("cleans up minute sync on unmount", () => {
    const cleanupMock = jest.fn();
    (setupMinuteSync as jest.Mock).mockReturnValue(cleanupMock);

    const { unmount } = render(<NowLine />);

    unmount();

    expect(cleanupMock).toHaveBeenCalled();
  });
});
